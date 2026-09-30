import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { bookingController } from "../controllers/booking.controller";
import {
  bookingIdParamSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingStatusSchema
} from "../schemas/booking.schema";

export const bookingRouter = Router();

bookingRouter.get("/", authenticate, validate(listBookingsQuerySchema, "query"), bookingController.list);
bookingRouter.post("/", authenticate, requireRole("customer"), validate(createBookingSchema), bookingController.create);
bookingRouter.get("/:id", authenticate, validate(bookingIdParamSchema, "params"), bookingController.getById);
bookingRouter.patch(
  "/:id/status",
  authenticate,
  validate(bookingIdParamSchema, "params"),
  validate(updateBookingStatusSchema),
  bookingController.updateStatus
);