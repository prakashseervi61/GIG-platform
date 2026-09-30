import { pool } from "../db/pool";

export interface WorkerEarnings {
  total: number;
  paidBookings: number;
  monthly: { month: string; amount: number; count: number }[];
}

export async function getWorkerEarningsStats(workerId: string): Promise<WorkerEarnings> {
  const totals = await pool.query<{ total: string; paid_bookings: number }>(
    `SELECT COALESCE(SUM(p.amount), 0)::numeric AS total, count(*)::int AS paid_bookings
     FROM payments p
     WHERE p.worker_id = $1 AND p.status = 'completed'`,
    [workerId]
  );
  const monthly = await pool.query<{ month: string; amount: string; count: number }>(
    `SELECT to_char(p.paid_at, 'YYYY-MM') AS month,
            COALESCE(SUM(p.amount), 0)::numeric AS amount,
            count(*)::int AS count
     FROM payments p
     WHERE p.worker_id = $1 AND p.status = 'completed'
     GROUP BY month
     ORDER BY month DESC
     LIMIT 12`,
    [workerId]
  );
  return {
    total: Number(totals.rows[0].total),
    paidBookings: totals.rows[0].paid_bookings,
    monthly: monthly.rows.map((row) => ({
      month: row.month,
      amount: Number(row.amount),
      count: row.count
    }))
  };
}