import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { workerController } from "../controllers/worker.controller";
import { earningsController } from "../controllers/earnings.controller";
import { ratingController } from "../controllers/rating.controller";
import {
  addCertificationSchema,
  addSkillSchema,
  idParamSchema,
  setAvailabilitySchema,
  skillIdParamSchema,
  updateWorkerProfileSchema
} from "../schemas/worker.schema";

export const workerRouter = Router();

workerRouter.get("/me/earnings", authenticate, requireRole("worker"), earningsController.earnings);
workerRouter.get("/me", authenticate, requireRole("worker"), workerController.getMe);
workerRouter.get("/:id/ratings", authenticate, validate(idParamSchema, "params"), ratingController.listForWorker);
workerRouter.get("/:id", authenticate, validate(idParamSchema, "params"), workerController.getById);
workerRouter.put("/:id", authenticate, validate(idParamSchema, "params"), validate(updateWorkerProfileSchema), workerController.update);
workerRouter.patch("/:id/availability", authenticate, validate(idParamSchema, "params"), validate(setAvailabilitySchema), workerController.availability);
workerRouter.post("/:id/skills", authenticate, validate(idParamSchema, "params"), validate(addSkillSchema), workerController.addSkill);
workerRouter.delete("/:id/skills/:skillId", authenticate, validate(skillIdParamSchema, "params"), workerController.removeSkill);
workerRouter.post("/:id/certifications", authenticate, validate(idParamSchema, "params"), validate(addCertificationSchema), workerController.addCertification);
workerRouter.get("/:id/certifications", authenticate, validate(idParamSchema, "params"), workerController.listCertifications);