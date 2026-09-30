import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";
import { changeBookingStatus, createBooking, getBookingForUser, listBookingsForUser } from "../services/booking.service";
import type {
  CreateBookingInput,
  ListBookingsQueryInput,
  UpdateBookingStatusInput
} from "../schemas/booking.schema";

const create = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const body = req.validated?.body as CreateBookingInput;
  const booking = await createBooking(user, body);
  res.status(201).json({ message: "Booking created", booking });
});

const list = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ListBookingsQueryInput) ?? {};
  const bookings = await listBookingsForUser(user, query);
  res.status(200).json({ bookings, count: bookings.length });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const booking = await getBookingForUser(user, id);
  res.status(200).json({ booking });
});

const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as UpdateBookingStatusInput;
  const booking = await changeBookingStatus(user, id, body);
  res.status(200).json({ message: `Booking ${body.status}`, booking });
});

export const bookingController = { create, list, getById, updateStatus };