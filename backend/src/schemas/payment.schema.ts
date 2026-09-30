import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(["upi", "card", "netbanking", "wallet"])
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid()
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const listPaymentsQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
export type ListPaymentsQueryInput = z.infer<typeof listPaymentsQuerySchema>;

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });

export const listInvoicesQuerySchema = z.object({
  status: z.enum(["issued", "paid", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;

export const invoiceIdParamSchema = z.object({ id: z.string().uuid() });