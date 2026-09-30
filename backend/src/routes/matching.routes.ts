import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { matchingController } from "../controllers/matching.controller";
import { matchWorkersQuerySchema } from "../schemas/booking.schema";

export const matchingRouter = Router();

matchingRouter.get("/workers", authenticate, validate(matchWorkersQuerySchema, "query"), matchingController.match);