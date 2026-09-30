import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body"): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const parsed = schema.parse(data);
      req.validated = { ...(req.validated ?? {}), [source]: parsed };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          ApiError.badRequest(
            "VALIDATION_ERROR",
            err.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
          )
        );
        return;
      }
      next(err);
    }
  };
}