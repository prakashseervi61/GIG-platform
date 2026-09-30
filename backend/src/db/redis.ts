import { createClient } from "redis";
import { config } from "../config";

export const redisClient = createClient({ url: config.redisUrl });

redisClient.on("error", (err) => {
  console.error("Redis client error:", err.message);
});

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) return;
  await redisClient.connect();
  console.log("Connected to Redis");
}

export async function closeRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}