import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number").optional(),
    email: z.string().email("Enter a valid email").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    role: z.enum(["customer", "worker"], { message: "Role must be customer or worker" }),
    language: z.string().min(2).max(10).default("en")
  })
  .refine((data) => data.phone || data.email, {
    message: "At least one of phone or email is required",
    path: ["phone"]
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your phone number or email"),
  password: z.string().min(1, "Password is required")
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  password_hash: string;
  role: "customer" | "worker" | "coop_admin" | "federation_admin";
  language: string;
  is_active: boolean;
}