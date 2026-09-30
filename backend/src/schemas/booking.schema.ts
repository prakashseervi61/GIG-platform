import { z } from "zod";

export const createBookingSchema = z
  .object({
    serviceId: z.string().uuid(),
    workerId: z.string().uuid().optional(),
    scheduledStart: z.string().datetime({ offset: true }),
    scheduledEnd: z.string().datetime({ offset: true }).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    address: z.string().trim().min(3).max(500),
    priority: z.enum(["normal", "emergency"]).default("normal"),
    radiusKm: z.coerce.number().min(1).max(100).default(15),
    notes: z.string().trim().max(500).optional()
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.scheduledStart);
    if (data.scheduledEnd) {
      const end = new Date(data.scheduledEnd);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledEnd"],
          message: "scheduledEnd must be after scheduledStart"
        });
      }
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const listBookingsQuerySchema = z.object({
  status: z.enum(["requested", "assigned", "accepted", "in_progress", "completed", "cancelled", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>;

export const bookingIdParamSchema = z.object({ id: z.string().uuid() });

export const updateBookingStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "in_progress", "completed", "cancelled"]),
  reason: z.string().trim().max(300).optional()
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

export const matchWorkersQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(100).default(15),
  priority: z.enum(["normal", "emergency"]).default("normal"),
  limit: z.coerce.number().int().min(1).max(20).default(5)
});

export type MatchWorkersQueryInput = z.infer<typeof matchWorkersQuerySchema>;

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;

export const notificationIdParamSchema = z.object({ id: z.string().uuid() });