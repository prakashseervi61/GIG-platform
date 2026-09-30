export type UserRole = "customer" | "worker" | "coop_admin" | "federation_admin";

export interface AuthUser {
  sub: string;
  role: UserRole;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export const ROLES: UserRole[] = ["customer", "worker", "coop_admin", "federation_admin"];

export const SELF_REGISTERABLE_ROLES: UserRole[] = ["customer", "worker"];