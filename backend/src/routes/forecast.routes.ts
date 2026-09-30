import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { forecastController } from "../controllers/forecast.controller";
import { forecastQuerySchema, workforceQuerySchema } from "../schemas/forecast.schema";

export const forecastRouter = Router();

forecastRouter.get(
  "/",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  validate(forecastQuerySchema, "query"),
  forecastController.forecast
);
forecastRouter.get(
  "/workforce",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  validate(workforceQuerySchema, "query"),
  forecastController.workforce
);
forecastRouter.get(
  "/validation",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  forecastController.validation
);
forecastRouter.post(
  "/rebuild",
  authenticate,
  requireRole("federation_admin"),
  forecastController.rebuild
);