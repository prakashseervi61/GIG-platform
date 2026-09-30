import { ApiError } from "../utils/ApiError";
import { hashPassword, verifyPassword } from "../utils/password";
import { findUserById, findUserByIdentifier, createUserWithWorker } from "../models/user.model";
import type { RegisterInput, UserRow } from "../schemas/auth.schema";

function isPgUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

export async function registerUser(data: RegisterInput): Promise<UserRow> {
  const existing = await findUserByIdentifier(data.phone ?? data.email ?? "");
  if (existing) {
    if (data.phone && existing.phone === data.phone) {
      throw ApiError.conflict("PHONE_TAKEN", "Phone number is already registered");
    }
    if (data.email && existing.email === data.email) {
      throw ApiError.conflict("EMAIL_TAKEN", "Email is already registered");
    }
  }

  const passwordHash = await hashPassword(data.password);
  const user = await createUserWithWorker({
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    passwordHash,
    role: data.role,
    language: data.language
  }).catch((err: unknown) => {
    if (isPgUniqueViolation(err)) {
      throw ApiError.conflict("CREDENTIAL_TAKEN", "Phone or email is already registered");
    }
    throw err;
  });

  return user;
}

export async function loginUser(identifier: string, password: string): Promise<UserRow> {
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    throw ApiError.unauthorized("INVALID_CREDENTIALS", "Invalid phone/email or password");
  }

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    throw ApiError.unauthorized("INVALID_CREDENTIALS", "Invalid phone/email or password");
  }

  if (!user.is_active) {
    throw ApiError.forbidden("ACCOUNT_DISABLED", "This account has been disabled");
  }

  return user;
}

export async function getUserById(id: string): Promise<UserRow> {
  const user = await findUserById(id);
  if (!user) {
    throw ApiError.notFound("USER_NOT_FOUND", "User not found");
  }
  return user;
}

export function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    language: user.language
  };
}