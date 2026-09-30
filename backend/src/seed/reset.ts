import { pool } from "../db/pool.js";

const TRANSACTIONAL_TABLES = [
  "customer_locations",
  "invoices",
  "payment_logs",
  "payments",
  "ratings",
  "notifications",
  "bookings",
  "worker_welfare",
  "verification_log",
  "forecast_runs",
  "forecast_daily",
];

async function reset(): Promise<void> {
  await pool.query(
    `TRUNCATE TABLE ${TRANSACTIONAL_TABLES.join(", ")} RESTART IDENTITY CASCADE`
  );
  await pool.query(
    "UPDATE workers SET rating = 0, rating_count = 0, is_available = TRUE"
  );
  console.log(
    `Reset: truncated ${TRANSACTIONAL_TABLES.length} transactional tables, restored worker ratings/availability.`
  );
  await import("./seed");
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});