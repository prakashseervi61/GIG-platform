import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound("NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected error occurred";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
    if (!(err as ZodError).issues) {
      console.error("Unhandled error:", err);
    }
  }

  res.status(statusCode).json({
    error: { code, message },
    requestId: (req as Request & { requestId?: string }).requestId
  });
}

export function logRequest(req: Request, _res: Response, next: NextFunction): void {
  const requestId =
    req.headers["x-request-id"]?.toString() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  (req as Request & { requestId?: string }).requestId = requestId;
  next();
}