import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { adminController } from "../controllers/admin.controller";
import {
  certificationIdParamSchema,
  idParamSchema,
  listWorkersQuerySchema,
  verifyCertificationSchema,
  verifyWorkerSchema
} from "../schemas/worker.schema";

export const adminRouter = Router();

adminRouter.get(
  "/analytics",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  adminController.analytics
);
adminRouter.get(
  "/dashboard",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  adminController.dashboard
);
adminRouter.get(
  "/workers",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  validate(listWorkersQuerySchema, "query"),
  adminController.listWorkers
);
adminRouter.patch(
  "/workers/:id/verify",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  validate(idParamSchema, "params"),
  validate(verifyWorkerSchema),
  adminController.verifyWorker
);
adminRouter.patch(
  "/workers/:id/certifications/:certificationId/verify",
  authenticate,
  requireRole("coop_admin", "federation_admin"),
  validate(certificationIdParamSchema, "params"),
  validate(verifyCertificationSchema),
  adminController.verifyCert
);