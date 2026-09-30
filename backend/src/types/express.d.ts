import type { AuthUser } from "../types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: Record<string, unknown>;
    }
  }
}

export {};