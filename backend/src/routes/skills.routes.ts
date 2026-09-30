import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { listSkills } from "../services/worker.service";

export const skillsRouter = Router();

skillsRouter.get(
  "/",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const skills = await listSkills();
    res.status(200).json({ skills });
  })
);