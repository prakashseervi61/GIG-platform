import app from "./app";
import { config } from "./config";
import { pool } from "./db/pool";
import { closeRedis, connectRedis } from "./db/redis";

async function bootstrap(): Promise<void> {
  await pool.query("SELECT 1");
  console.log("Database connection verified");

  await connectRedis();

  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await closeRedis();
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});