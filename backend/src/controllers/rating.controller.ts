import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createRating, listWorkerRatings } from "../services/rating.service";
import type { CreateRatingInput } from "../schemas/rating.schema";
import type { AuthUser } from "../types";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const input = req.validated?.body as CreateRatingInput;
  const result = await createRating(user, input);
  res.status(201).json(result);
});

export const listForWorker = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validated?.params as { id: string };
  const result = await listWorkerRatings(id);
  res.status(200).json(result);
});

export const ratingController = { create, listForWorker };