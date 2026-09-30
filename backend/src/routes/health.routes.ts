import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool";
import { redisClient } from "../db/redis";
import { asyncHandler } from "../utils/asyncHandler";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const dbResult = await pool.query("SELECT 1 AS ok");
    const redisStatus = redisClient.isReady ? "up" : "down";

    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      components: {
        database: dbResult.rows[0]?.ok === 1 ? "up" : "down",
        redis: redisStatus
      }
    });
  })
);