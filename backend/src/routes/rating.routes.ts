import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ratingController } from "../controllers/rating.controller";
import { createRatingSchema } from "../schemas/rating.schema";

export const ratingRouter = Router();

ratingRouter.post(
  "/",
  authenticate,
  requireRole("customer"),
  validate(createRatingSchema),
  ratingController.create
);