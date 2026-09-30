import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { matchWorkers } from "../services/matching.service";
import type { MatchWorkersQueryInput } from "../schemas/booking.schema";

const match = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as MatchWorkersQueryInput;
  const candidates = await matchWorkers({
    serviceId: query.serviceId,
    category: query.category,
    lat: query.lat,
    lng: query.lng,
    radiusKm: query.radiusKm,
    priority: query.priority,
    limit: query.limit
  });
  res.status(200).json({ query, candidates });
});

export const matchingController = { match };