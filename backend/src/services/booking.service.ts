import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import { redisClient } from "../db/redis";
import { getServiceById, getServiceSkillIds } from "../models/service.model";
import {
  generateBookingNumber,
  getBookingById,
  getWorkerEligible,
  hasOverlappingBooking,
  insertBooking,
  listBookings,
  updateBookingStatus,
  workerHasAllSkills,
  type BookingDetails
} from "../models/booking.model";
import { getCooperativesManagedByAdmin } from "../models/worker.model";
import { getOwnWorkerId } from "./worker.service";
import { matchWorkers } from "./matching.service";
import { insertNotification } from "../models/notification.model";
import { updateWorkerReliability } from "../models/worker.model";
import { ingestBookingDaily } from "../models/forecast.model";
import type { CreateBookingInput, ListBookingsQueryInput, UpdateBookingStatusInput } from "../schemas/booking.schema";

const WORKER_LOCK_TTL_SECONDS = 20;
const BACKUP_NOTIFICATION_COUNT = 2;

async function acquireWorkerLock(workerId: string): Promise<boolean> {
  try {
    const result = await redisClient.set(`booking:worker:${workerId}`, "1", {
      NX: true,
      EX: WORKER_LOCK_TTL_SECONDS
    });
    return result === "OK";
  } catch {
    return true;
  }
}

async function releaseWorkerLock(workerId: string): Promise<void> {
  try {
    await redisClient.del(`booking:worker:${workerId}`);
  } catch {
    /* lock expiry is the safety net */
  }
}

function ensureSchedulable(input: Pick<CreateBookingInput, "priority" | "scheduledStart" | "scheduledEnd">): {
  start: Date;
  end: Date;
} {
  const start = new Date(input.scheduledStart);
  const end = input.scheduledEnd ? new Date(input.scheduledEnd) : new Date(start.getTime() + 90 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw ApiError.badRequest("INVALID_SCHEDULE", "scheduledStart/scheduledEnd are invalid dates");
  }
  if (end <= start) {
    throw ApiError.badRequest("INVALID_SCHEDULE", "scheduledEnd must be after scheduledStart");
  }
  if (input.priority === "normal" && start.getTime() < Date.now()) {
    throw ApiError.badRequest("SCHEDULE_IN_PAST", "Scheduled start must be in the future for normal bookings");
  }
  if (input.priority === "emergency" && start.getTime() < Date.now() - 5 * 60 * 1000) {
    throw ApiError.badRequest("SCHEDULE_IN_PAST", "Emergency booking start time is too far in the past");
  }
  return { start, end };
}

function bookingPrice(serviceBasePrice: number, priority: "normal" | "emergency"): number {
  const multiplier = priority === "emergency" ? 1.2 : 1;
  return Math.round(serviceBasePrice * multiplier * 100) / 100;
}

export async function createBooking(user: AuthUser, input: CreateBookingInput): Promise<BookingDetails> {
  const service = await getServiceById(input.serviceId);
  if (!service) {
    throw ApiError.notFound("SERVICE_NOT_FOUND", "Service not found or inactive");
  }

  const { start, end } = ensureSchedulable(input);
  const preferredWorkerId = input.workerId;
  const serviceSkillIds = await getServiceSkillIds(service.id);

  let chosenWorker: { id: string; userId: string; cooperativeId: string | null } | null = null;
  let rankedCandidates: Awaited<ReturnType<typeof matchWorkers>> = [];

  if (preferredWorkerId) {
    const eligible = await getWorkerEligible(preferredWorkerId);
    if (!eligible) {
      throw ApiError.badRequest("WORKER_NOT_FOUND", "Worker does not exist");
    }
    if (eligible.verificationStatus !== "approved") {
      throw ApiError.badRequest("WORKER_NOT_VERIFIED", "Worker is not verified yet");
    }
    if (!eligible.isAvailable) {
      throw ApiError.badRequest("WORKER_UNAVAILABLE", "Worker is currently unavailable");
    }
    if (!(await workerHasAllSkills(eligible.id, serviceSkillIds))) {
      throw ApiError.badRequest("WORKER_SKILL_MISMATCH", "Worker does not have the skill required by this service");
    }
    chosenWorker = { id: eligible.id, userId: eligible.userId, cooperativeId: eligible.cooperativeId };
  } else {
    rankedCandidates = await matchWorkers({
      serviceId: service.id,
      lat: input.latitude,
      lng: input.longitude,
      radiusKm: input.radiusKm,
      priority: input.priority,
      limit: 10
    });
    for (const candidate of rankedCandidates) {
      if (await hasOverlappingBooking(candidate.worker.id, start, end)) continue;
      chosenWorker = {
        id: candidate.worker.id,
        userId: candidate.worker.userId,
        cooperativeId: candidate.worker.cooperativeId
      };
      break;
    }
    if (!chosenWorker) {
      throw ApiError.conflict(
        "NO_AVAILABLE_WORKERS",
        "No matching verified worker is available for this slot. Try a different time or wider radius."
      );
    }
  }

  let workerLocked = false;
  try {
    workerLocked = await acquireWorkerLock(chosenWorker.id);
    if (!workerLocked) {
      throw ApiError.conflict("BOOKING_CONFLICT", "That worker is being booked right now. Please try again.");
    }
    if (await hasOverlappingBooking(chosenWorker.id, start, end)) {
      throw ApiError.conflict("WORKER_SCHEDULE_CONFLICT", "That worker already has a booking in this time window");
    }

    const price = bookingPrice(Number(service.base_price), input.priority);
    const created = await insertBooking({
      bookingNumber: generateBookingNumber(),
      customerId: user.sub,
      workerId: chosenWorker.id,
      serviceId: service.id,
      cooperativeId: chosenWorker.cooperativeId,
      scheduledStart: start,
      scheduledEnd: end,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      priority: input.priority,
      price,
      notes: input.notes ?? null
    });

    await insertNotification(
      chosenWorker.userId,
      "new_booking",
      "New booking request",
      `New ${input.priority} booking for ${service.name} at ${input.address} scheduled ${start.toISOString()}`,
      { bookingId: created.id, bookingNumber: created.booking_number, serviceId: service.id }
    );

    if (rankedCandidates.length > 0) {
      const backups = rankedCandidates
        .filter((candidate) => candidate.worker.id !== chosenWorker!.id)
        .slice(0, BACKUP_NOTIFICATION_COUNT);
      for (const backup of backups) {
        await insertNotification(
          backup.worker.userId,
          "booking_backup",
          "Booking backup alert",
          `A booking for ${service.name} near you could not reach the first choice. Keep an eye out.`,
          { bookingId: created.id, serviceId: service.id }
        );
      }
    }

    const details = await getBookingById(created.id);
    if (details) {
      try {
        await ingestBookingDaily({
          zone: details.cooperativeName ?? "UNAFFILIATED",
          category: details.serviceCategory,
          date: new Date().toISOString().slice(0, 10),
          emergency: details.priority === "emergency"
        });
      } catch (ingestErr) {
        console.error("forecast ingest failed (non-blocking):", (ingestErr as Error).message);
      }
    }
    return details!;
  } finally {
    if (workerLocked) {
      await releaseWorkerLock(chosenWorker.id);
    }
  }
}

export async function listBookingsForUser(user: AuthUser, query: ListBookingsQueryInput): Promise<BookingDetails[]> {
  switch (user.role) {
    case "customer":
      return listBookings({ customerId: user.sub, status: query.status, limit: query.limit, offset: query.offset });
    case "worker":
      return listBookings({
        workerId: await getOwnWorkerId(user.sub),
        status: query.status,
        limit: query.limit,
        offset: query.offset
      });
    case "coop_admin": {
      const coops = await getCooperativesManagedByAdmin(user.sub);
      return listBookings({
        cooperativeIds: coops.map((c) => c.id),
        status: query.status,
        limit: query.limit,
        offset: query.offset
      });
    }
    default:
      return listBookings({ status: query.status, limit: query.limit, offset: query.offset });
  }
}

export async function getBookingForUser(user: AuthUser, bookingId: string): Promise<BookingDetails> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw ApiError.notFound("BOOKING_NOT_FOUND", "Booking not found");
  }
  switch (user.role) {
    case "customer":
      if (booking.customerId !== user.sub) throw ApiError.forbidden("FORBIDDEN", "You can only view your own bookings");
      return booking;
    case "worker": {
      const workerId = await getOwnWorkerId(user.sub);
      if (booking.workerId !== workerId) throw ApiError.forbidden("FORBIDDEN", "You can only view bookings assigned to you");
      return booking;
    }
    case "coop_admin": {
      const coops = await getCooperativesManagedByAdmin(user.sub);
      if (!coops.some((c) => c.id === booking.cooperativeId)) {
        throw ApiError.forbidden("FORBIDDEN", "You can only view bookings of your cooperative");
      }
      return booking;
    }
    default:
      return booking;
  }
}

const TRANSITIONS: Record<string, string[]> = {
  requested: ["accepted", "rejected", "cancelled"],
  assigned: ["accepted", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed"]
};

export async function changeBookingStatus(
  user: AuthUser,
  bookingId: string,
  input: UpdateBookingStatusInput
): Promise<BookingDetails> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw ApiError.notFound("BOOKING_NOT_FOUND", "Booking not found");
  }

  const allowed = TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.badRequest(
      "INVALID_TRANSITION",
      `Cannot move booking ${booking.bookingNumber} from ${booking.status} to ${input.status}`
    );
  }

  const canDo = (): boolean => {
    switch (user.role) {
      case "customer":
        return input.status === "cancelled" && booking.customerId === user.sub;
      case "worker": {
        const isAssignedWorker = booking.workerId != null && booking.workerUserId === user.sub;
        return isAssignedWorker && ["accepted", "rejected", "in_progress", "completed"].includes(input.status);
      }
      case "coop_admin":
        return input.status === "cancelled" && booking.cooperativeId != null; // scope re-checked below
      default:
        return input.status === "cancelled";
    }
  };

  if (!canDo()) {
    throw ApiError.forbidden("FORBIDDEN", "You are not allowed to move this booking to that status");
  }

  if (user.role === "coop_admin") {
    const coops = await getCooperativesManagedByAdmin(user.sub);
    if (!coops.some((c) => c.id === booking.cooperativeId)) {
      throw ApiError.forbidden("FORBIDDEN", "You can only manage bookings of your cooperative");
    }
  }

  const updated = await updateBookingStatus(booking.id, input.status);
  if (!updated) {
    throw ApiError.notFound("BOOKING_NOT_FOUND", "Booking not found");
  }

  if (input.status === "completed" && booking.workerId) {
    await updateWorkerReliability(booking.workerId);
  }

  const noteSuffix = input.reason ? ` (${input.reason})` : "";
  const message = `Booking ${booking.bookingNumber} is now ${input.status}${noteSuffix}`;

  if (booking.workerUserId && booking.workerUserId !== user.sub) {
    await insertNotification(booking.workerUserId, "booking_status", "Booking status update", message, {
      bookingId: booking.id,
      status: input.status
    });
  }
  if (booking.customerId && booking.customerId !== user.sub) {
    await insertNotification(booking.customerId, "booking_status", "Booking status update", message, {
      bookingId: booking.id,
      status: input.status
    });
  }

  return (await getBookingById(booking.id))!;
}