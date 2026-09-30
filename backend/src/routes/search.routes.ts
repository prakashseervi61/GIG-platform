import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { discoveryController } from "../controllers/discovery.controller";
import { searchWorkersQuerySchema } from "../schemas/discovery.schema";

export const searchRouter = Router();

searchRouter.get("/workers", authenticate, validate(searchWorkersQuerySchema, "query"), discoveryController.searchWorkers);