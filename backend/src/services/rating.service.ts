import type { AuthUser } from "../types";
import { ApiError } from "../utils/ApiError";
import { getBookingById } from "../models/booking.model";
import { getWorkerProfile } from "../models/worker.model";
import { getRatingByBookingId, insertRatingAndUpdateWorker, listRatingsByWorker } from "../models/rating.model";
import { insertNotification } from "../models/notification.model";
import type { CreateRatingInput } from "../schemas/rating.schema";

export async function createRating(user: AuthUser, input: CreateRatingInput) {
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    throw ApiError.notFound("BOOKING_NOT_FOUND", "Booking not found");
  }
  if (booking.customerId !== user.sub) {
    throw ApiError.forbidden("FORBIDDEN", "You can only rate your own bookings");
  }
  if (booking.status !== "completed") {
    throw ApiError.badRequest("BOOKING_NOT_COMPLETED", "Only completed bookings can be rated");
  }
  if (!booking.workerId) {
    throw ApiError.badRequest("NO_WORKER_ASSIGNED", "This booking has no assigned worker");
  }

  const existing = await getRatingByBookingId(booking.id);
  if (existing) {
    throw ApiError.conflict("ALREADY_RATED", "This booking has already been rated");
  }

  const rating = await insertRatingAndUpdateWorker({
    bookingId: booking.id,
    customerId: user.sub,
    workerId: booking.workerId,
    rating: input.rating,
    comment: input.comment ?? null
  });

  if (booking.workerUserId) {
    await insertNotification(
      booking.workerUserId,
      "rating_received",
      "New rating received",
      `You received a ${input.rating}-star rating on booking ${booking.bookingNumber}`,
      { bookingId: booking.id, rating: input.rating }
    );
  }

  const worker = await getWorkerProfile(booking.workerId);
  return {
    rating,
    workerSummary: {
      id: worker!.id,
      rating: worker!.rating,
      ratingCount: worker!.ratingCount
    }
  };
}

export async function listWorkerRatings(workerId: string) {
  const worker = await getWorkerProfile(workerId);
  if (!worker) {
    throw ApiError.notFound("WORKER_NOT_FOUND", "Worker not found");
  }
  const ratings = await listRatingsByWorker(workerId);
  return {
    workerId,
    workerName: worker.name,
    averageRating: worker.rating,
    ratingCount: worker.ratingCount,
    ratings
  };
}