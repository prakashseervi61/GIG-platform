import { z } from "zod";

export const forecastQuerySchema = z.object({
  category: z.string().trim().optional(),
  zone: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date as YYYY-MM-DD").optional(),
  days: z.coerce.number().int().min(1).max(30).default(7)
});
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;

export const workforceQuerySchema = z.object({
  category: z.string().trim().optional(),
  zone: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date as YYYY-MM-DD").optional(),
  days: z.coerce.number().int().min(1).max(30).default(7),
  capacityPerWorker: z.coerce.number().int().min(1).max(32).default(1)
});
export type WorkforceQueryInput = z.infer<typeof workforceQuerySchema>;