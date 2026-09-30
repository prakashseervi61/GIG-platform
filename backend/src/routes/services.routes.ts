import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { discoveryController } from "../controllers/discovery.controller";
import { idParamSchema, listServicesQuerySchema } from "../schemas/discovery.schema";

export const servicesRouter = Router();

servicesRouter.get("/", authenticate, validate(listServicesQuerySchema, "query"), discoveryController.listServices);
servicesRouter.get("/:id", authenticate, validate(idParamSchema, "params"), discoveryController.getServiceById);