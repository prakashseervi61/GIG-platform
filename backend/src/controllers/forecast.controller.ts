import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  evaluateValidation,
  generateForecast,
  generateWorkforce
} from "../services/forecast.service";
import { rebuildForecastDataset } from "../models/forecast.model";
import type { ForecastQueryInput, WorkforceQueryInput } from "../schemas/forecast.schema";
import type { AuthUser } from "../types";

const forecast = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ForecastQueryInput) ?? {};
  res.status(200).json(await generateForecast(user, query));
});

const workforce = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as WorkforceQueryInput) ?? {};
  res.status(200).json(await generateWorkforce(user, query));
});

const validation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  res.status(200).json(await evaluateValidation(user));
});

const rebuild = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const result = await rebuildForecastDataset(user.sub);
  res.status(201).json({ message: "Forecast dataset rebuilt from booking history", ...result });
});

export const forecastController = { forecast, workforce, validation, rebuild };