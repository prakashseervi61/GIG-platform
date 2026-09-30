import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";

export type BookingStatus =
  | "requested"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export interface BookingRow {
  id: string;
  booking_number: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  cooperative_id: string | null;
  scheduled_start: Date;
  scheduled_end: Date;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: BookingStatus;
  priority: "normal" | "emergency";
  price: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookingDetails {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  workerId: string | null;
  workerUserId: string | null;
  workerName: string | null;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceBasePrice: number;
  cooperativeId: string | null;
  cooperativeName: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: BookingStatus;
  priority: "normal" | "emergency";
  price: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BOOKING_SELECT = `
  SELECT
    b.*,
    cu.name AS customer_name,
    wo.user_id AS worker_user_id,
    uw.name AS worker_name,
    s.name AS service_name,
    s.category AS service_category,
    s.base_price AS service_base_price,
    COALESCE(c.name, '') AS cooperative_name
  FROM bookings b
  JOIN users cu ON cu.id = b.customer_id
  LEFT JOIN workers wo ON wo.id = b.worker_id
  LEFT JOIN users uw ON uw.id = wo.user_id
  JOIN services s ON s.id = b.service_id
  LEFT JOIN cooperatives c ON c.id = b.cooperative_id
`;

export function mapBookingRow(row: Record<string, unknown>): BookingDetails {
  return {
    id: row.id as string,
    bookingNumber: row.booking_number as string,
    customerId: row.customer_id as string,
    customerName: row.customer_name as string,
    workerId: (row.worker_id as string | null) ?? null,
    workerUserId: (row.worker_user_id as string | null) ?? null,
    workerName: (row.worker_name as string | null) ?? null,
    serviceId: row.service_id as string,
    serviceName: row.service_name as string,
    serviceCategory: row.service_category as string,
    serviceBasePrice: Number(row.service_base_price),
    cooperativeId: (row.cooperative_id as string | null) ?? null,
    cooperativeName: row.cooperative_name ? (row.cooperative_name as string) : null,
    scheduledStart: new Date(row.scheduled_start as string),
    scheduledEnd: new Date(row.scheduled_end as string),
    address: row.address as string,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    status: row.status as BookingStatus,
    priority: row.priority as "normal" | "emergency",
    price: Number(row.price),
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string)
  };
}

export interface CreateBookingRecordInput {
  bookingNumber: string;
  customerId: string;
  workerId: string;
  serviceId: string;
  cooperativeId: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  address: string;
  latitude: number;
  longitude: number;
  priority: "normal" | "emergency";
  price: number;
  notes: string | null;
}

export async function insertBooking(input: CreateBookingRecordInput) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO bookings (
         booking_number, customer_id, worker_id, service_id, cooperative_id,
         scheduled_start, scheduled_end, address, latitude, longitude, status, priority, price, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested', $11, $12, $13)
       RETURNING *`,
      [
        input.bookingNumber,
        input.customerId,
        input.workerId,
        input.serviceId,
        input.cooperativeId,
        input.scheduledStart,
        input.scheduledEnd,
        input.address,
        input.latitude,
        input.longitude,
        input.priority,
        input.price,
        input.notes
      ]
    );
    return rows[0] as BookingRow;
  });
}

export async function getBookingById(id: string): Promise<BookingDetails | null> {
  const { rows } = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] ? mapBookingRow(rows[0]) : null;
}

export interface ListBookingsFilter {
  customerId?: string;
  workerId?: string;
  cooperativeIds?: string[] | null;
  status?: BookingStatus;
  limit: number;
  offset: number;
}

export async function listBookings(filter: ListBookingsFilter): Promise<BookingDetails[]> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filter.customerId) {
    args.push(filter.customerId);
    where.push(`b.customer_id = $${args.length}`);
  }
  if (filter.workerId) {
    args.push(filter.workerId);
    where.push(`b.worker_id = $${args.length}`);
  }
  if (filter.cooperativeIds) {
    if (filter.cooperativeIds.length === 0) return [];
    args.push(filter.cooperativeIds);
    where.push(`b.cooperative_id = ANY($${args.length}::uuid[])`);
  }
  if (filter.status) {
    args.push(filter.status);
    where.push(`b.status = $${args.length}`);
  }

  args.push(filter.limit, filter.offset);
  const { rows } = await pool.query(
    `${BOOKING_SELECT}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY b.created_at DESC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows.map((r) => mapBookingRow(r));
}

export async function hasOverlappingBooking(
  workerId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const args: unknown[] = [workerId, start, end];
  let excludeSql = "";
  if (excludeBookingId) {
    args.push(excludeBookingId);
    excludeSql = ` AND b.id <> $4`;
  }
  const { rows } = await pool.query(
    `SELECT 1 FROM bookings b
     WHERE b.worker_id = $1
       AND b.status IN ('requested', 'assigned', 'accepted', 'in_progress')
       AND NOT (b.scheduled_end <= $2 OR b.scheduled_start >= $3)${excludeSql}
     LIMIT 1`,
    args
  );
  return rows.length > 0;
}

export interface EligibleWorker {
  id: string;
  userId: string;
  name: string;
  cooperativeId: string | null;
  verificationStatus: string;
  isAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
}

export async function getWorkerEligible(workerId: string): Promise<EligibleWorker | null> {
  const { rows } = await pool.query(
    `SELECT w.id, w.user_id, w.cooperative_id, w.verification_status, w.is_available, w.latitude, w.longitude, u.name
     FROM workers w JOIN users u ON u.id = w.user_id
     WHERE w.id = $1`,
    [workerId]
  );
  const r = rows[0];
  return r
    ? {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        cooperativeId: r.cooperative_id ?? null,
        verificationStatus: r.verification_status,
        isAvailable: r.is_available,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null
      }
    : null;
}

export async function workerHasAllSkills(workerId: string, skillIds: string[]): Promise<boolean> {
  if (skillIds.length === 0) return true;
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM worker_skills
     WHERE worker_id = $1 AND skill_id = ANY($2::uuid[])`,
    [workerId, skillIds]
  );
  return Number(rows[0].count) === skillIds.length;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<BookingRow | null> {
  const { rows } = await pool.query(
    `UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] ?? null;
}

export function generateBookingNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GIG-${ymd}-${rand}`;
}