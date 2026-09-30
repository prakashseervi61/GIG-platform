import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import type { AuthUser } from "../types";

function extractBearerToken(authorization?: string): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next(ApiError.unauthorized("TOKEN_MISSING", "Authentication token is required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user: AuthUser = {
      sub: payload.sub,
      role: payload.role,
      name: payload.name
    };
    req.user = user;
    next();
  } catch {
    next(ApiError.unauthorized("TOKEN_INVALID", "Authentication token is invalid or expired"));
  }
}

export function requireRole(...roles: AuthUser["role"][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role as AuthUser["role"])) {
      next(ApiError.forbidden("FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}