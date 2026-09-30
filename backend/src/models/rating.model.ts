import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";

export interface RatingRow {
  id: string;
  bookingId: string;
  customerId: string;
  workerId: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  createdAt: Date;
}

export function mapRatingRow(row: Record<string, unknown>): RatingRow {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    customerId: row.customer_id as string,
    workerId: row.worker_id as string,
    rating: Number(row.rating),
    comment: (row.comment as string | null) ?? null,
    customerName: (row.customer_name as string | null) ?? null,
    createdAt: new Date(row.created_at as string)
  };
}

export async function getRatingByBookingId(bookingId: string): Promise<RatingRow | null> {
  const { rows } = await pool.query(
    `SELECT id, booking_id, customer_id, worker_id, rating, comment, created_at
     FROM ratings WHERE booking_id = $1`,
    [bookingId]
  );
  return rows[0] ? mapRatingRow(rows[0]) : null;
}

export interface InsertRatingInput {
  bookingId: string;
  customerId: string;
  workerId: string;
  rating: number;
  comment: string | null;
}

export async function insertRatingAndUpdateWorker(input: InsertRatingInput): Promise<RatingRow> {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO ratings (booking_id, customer_id, worker_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, booking_id, customer_id, worker_id, rating, comment, created_at`,
      [input.bookingId, input.customerId, input.workerId, input.rating, input.comment]
    );
    await client.query(
      `UPDATE workers
       SET rating = round(((rating * rating_count) + $2)::numeric / (rating_count + 1), 2),
           rating_count = rating_count + 1,
           updated_at = now()
       WHERE id = $1`,
      [input.workerId, input.rating]
    );
    return mapRatingRow(rows[0]);
  });
}

export async function listRatingsByWorker(workerId: string, limit = 50): Promise<RatingRow[]> {
  const { rows } = await pool.query(
    `SELECT r.id, r.booking_id, r.customer_id, r.worker_id, r.rating, r.comment, r.created_at,
            u.name AS customer_name
     FROM ratings r
     JOIN users u ON u.id = r.customer_id
     WHERE r.worker_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [workerId, limit]
  );
  return rows.map((r) => mapRatingRow(r));
}