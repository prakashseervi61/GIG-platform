import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid worker id")
});

export const skillIdParamSchema = z.object({
  id: z.string().uuid("Invalid worker id"),
  skillId: z.string().uuid("Invalid skill id")
});

export const certificationIdParamSchema = z.object({
  id: z.string().uuid("Invalid worker id"),
  certificationId: z.string().uuid("Invalid certification id")
});

export const updateWorkerProfileSchema = z.object({
  experienceYears: z.number().int().min(0).max(80).optional(),
  hourlyRate: z.number().min(0).max(100000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cooperativeId: z.string().uuid("Invalid cooperative id").optional()
});

export const setAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

export const addSkillSchema = z.object({
  skillId: z.string().uuid("Invalid skill id"),
  experienceLevel: z.number().int().min(1).max(10).default(1)
});

export const removeSkillSchema = z.object({
  skillId: z.string().uuid("Invalid skill id")
});

export const addCertificationSchema = z.object({
  issuer: z.string().trim().min(1, "Issuer is required").max(200),
  certificateNumber: z.string().trim().max(100).optional(),
  issueDate: z.coerce.date().optional(),
  validity: z.coerce.date().optional(),
  documentUrl: z.string().url("Enter a valid URL").optional()
});

export const verifyWorkerSchema = z.object({
  status: z.enum(["approved", "rejected"], { message: "Status must be approved or rejected" }),
  note: z.string().trim().max(500).optional()
});

export const verifyCertificationSchema = z.object({
  status: z.enum(["approved", "rejected"], { message: "Status must be approved or rejected" }),
  note: z.string().trim().max(500).optional()
});

export const listWorkersQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  cooperativeId: z.string().uuid("Invalid cooperative id").optional(),
  search: z.string().trim().min(1).max(100).optional()
});

export type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddCertificationInput = z.infer<typeof addCertificationSchema>;
export type VerifyWorkerInput = z.infer<typeof verifyWorkerSchema>;
export type VerifyCertificationInput = z.infer<typeof verifyCertificationSchema>;
export type ListWorkersQueryInput = z.infer<typeof listWorkersQuerySchema>;