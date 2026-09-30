import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const listServicesQuerySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["popular"]).optional()
});

export type ListServicesQueryInput = z.infer<typeof listServicesQuerySchema>;

export const saveLocationSchema = z
  .object({
    address: z.string().trim().min(3).max(500),
    label: z.string().trim().min(1).max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional()
  })
  .superRefine(({ latitude, longitude }, ctx) => {
    if ((latitude == null) !== (longitude == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude and longitude must be provided together"
      });
    }
  });

export type SaveLocationInput = z.infer<typeof saveLocationSchema>;

const addressFields = z.object({
  label: z.string().trim().min(1).max(100),
  address: z.string().trim().min(3).max(500),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional()
});

const pairCheck = (val: { latitude?: number; longitude?: number }, ctx: z.RefinementCtx) => {
  if ((val.latitude == null) !== (val.longitude == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["latitude"],
      message: "latitude and longitude must be provided together"
    });
  }
};

export const createAddressSchema = addressFields.superRefine(pairCheck);
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = addressFields
  .partial()
  .refine((v: Record<string, unknown>) => Object.keys(v).length > 0, {
    message: "At least one field is required"
  })
  .superRefine(pairCheck);
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export const searchWorkersQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(100).default(15),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).max(100000).optional(),
  sort: z.enum(["distance", "rating", "price"]).default("distance")
});

export type SearchWorkersQueryInput = z.infer<typeof searchWorkersQuerySchema>;