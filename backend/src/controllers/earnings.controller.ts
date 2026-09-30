import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getWorkerEarnings } from "../services/earnings.service";
import type { AuthUser } from "../types";

const earnings = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const result = await getWorkerEarnings(user);
  res.status(200).json(result);
});

export const earningsController = { earnings };