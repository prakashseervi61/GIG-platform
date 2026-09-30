import { pool } from "../db/pool";

export interface AnalyticsScope {
  coopIds: string[] | null;
}

export interface DashboardKpis {
  totalWorkers: number;
  verifiedWorkers: number;
  pendingVerifications: number;
  totalCustomers: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  emergencyBookings: number;
  transactionValue: number;
  avgRating: number;
}

export async function getDashboardKpis(scope: AnalyticsScope): Promise<DashboardKpis> {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM workers w
         WHERE $2::uuid[] IS NULL OR w.cooperative_id IS NULL OR w.cooperative_id = ANY($2::uuid[])) AS total_workers,
       (SELECT count(*)::int FROM workers w
         WHERE w.verification_status = 'approved'
           AND ($2::uuid[] IS NULL OR w.cooperative_id IS NULL OR w.cooperative_id = ANY($2::uuid[]))) AS verified_workers,
       (SELECT count(*)::int FROM workers w
         WHERE w.verification_status = 'pending'
           AND ($2::uuid[] IS NULL OR w.cooperative_id IS NULL OR w.cooperative_id = ANY($2::uuid[]))) AS pending_verifications,
       (SELECT count(*)::int FROM users u WHERE u.role = 'customer') AS total_customers,
       (SELECT count(*)::int FROM bookings b
         WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])) AS total_bookings,
       (SELECT count(*)::int FROM bookings b
         WHERE b.status IN ('accepted', 'in_progress')
           AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))) AS active_bookings,
       (SELECT count(*)::int FROM bookings b
         WHERE b.status = 'completed'
           AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))) AS completed_bookings,
       (SELECT count(*)::int FROM bookings b
         WHERE b.priority = 'emergency'
           AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))) AS emergency_bookings,
       (SELECT COALESCE(SUM(p.amount), 0)::numeric
         FROM payments p JOIN bookings b ON b.id = p.booking_id
         WHERE p.status = 'completed'
           AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))) AS transaction_value,
       (SELECT COALESCE(AVG(r.rating), 0)::numeric
         FROM ratings r JOIN bookings b ON b.id = r.booking_id
         WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])) AS avg_rating`,
    [scope.coopIds, scope.coopIds]
  );
  const r = rows[0];
  return {
    totalWorkers: r.total_workers,
    verifiedWorkers: r.verified_workers,
    pendingVerifications: r.pending_verifications,
    totalCustomers: r.total_customers,
    totalBookings: r.total_bookings,
    activeBookings: r.active_bookings,
    completedBookings: r.completed_bookings,
    emergencyBookings: r.emergency_bookings,
    transactionValue: Number(r.transaction_value),
    avgRating: Number(r.avg_rating)
  };
}

export interface BookingAnalytics {
  bookingsByStatus: { status: string; count: number }[];
  bookingsByDay: { day: string; count: number }[];
  revenueByDay: { day: string; amount: number }[];
  bookingsByService: { service: string; category: string; bookings: number; revenue: number }[];
  bookingsByCategory: { category: string; bookings: number; revenue: number }[];
  topWorkers: { id: string; name: string; completed: number; total: number; revenue: number; rating: number }[];
}

const DAYS = 14;

export async function getBookingAnalytics(scope: AnalyticsScope): Promise<BookingAnalytics> {
  const { rows: statuses } = await pool.query(
    `SELECT status, count(*)::int AS count
     FROM bookings b
     WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])
     GROUP BY status
     ORDER BY count DESC`,
    [scope.coopIds]
  );
  const { rows: byDay } = await pool.query(
    `SELECT to_char(date_trunc('day', b.created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
     FROM bookings b
     WHERE b.created_at >= now() - ($2::int || ' days')::interval
       AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))
     GROUP BY day
     ORDER BY day ASC`,
    [scope.coopIds, DAYS]
  );
  const { rows: revenue } = await pool.query(
    `SELECT to_char(date_trunc('day', p.paid_at), 'YYYY-MM-DD') AS day, COALESCE(SUM(p.amount), 0)::numeric AS amount
     FROM payments p JOIN bookings b ON b.id = p.booking_id
     WHERE p.status = 'completed' AND p.paid_at >= now() - ($2::int || ' days')::interval
       AND ($1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[]))
     GROUP BY day
     ORDER BY day ASC`,
    [scope.coopIds, DAYS]
  );
  const { rows: byService } = await pool.query(
    `SELECT s.name AS service, s.category, count(*)::int AS bookings, COALESCE(SUM(b.price), 0)::numeric AS revenue
     FROM bookings b JOIN services s ON s.id = b.service_id
     WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])
     GROUP BY s.name, s.category
     ORDER BY bookings DESC
     LIMIT 10`,
    [scope.coopIds]
  );
  const { rows: byCategory } = await pool.query(
    `SELECT s.category, count(*)::int AS bookings, COALESCE(SUM(b.price), 0)::numeric AS revenue
     FROM bookings b JOIN services s ON s.id = b.service_id
     WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])
     GROUP BY s.category
     ORDER BY bookings DESC`,
    [scope.coopIds]
  );
  const { rows: topWorkers } = await pool.query(
    `SELECT w.id, u.name, w.rating,
       count(*) FILTER (WHERE b.status = 'completed')::int AS completed,
       count(*)::int AS total,
       COALESCE(SUM(p.amount), 0)::numeric AS revenue
     FROM bookings b
     JOIN workers w ON w.id = b.worker_id
     JOIN users u ON u.id = w.user_id
     LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'completed'
     WHERE $1::uuid[] IS NULL OR b.cooperative_id = ANY($1::uuid[])
     GROUP BY w.id, u.name, w.rating
     ORDER BY completed DESC, revenue DESC
     LIMIT 10`,
    [scope.coopIds]
  );
  return {
    bookingsByStatus: statuses.map((r) => ({ status: r.status, count: r.count })),
    bookingsByDay: byDay.map((r) => ({ day: r.day, count: r.count })),
    revenueByDay: revenue.map((r) => ({ day: r.day, amount: Number(r.amount) })),
    bookingsByService: byService.map((r) => ({
      service: r.service,
      category: r.category,
      bookings: r.bookings,
      revenue: Number(r.revenue)
    })),
    bookingsByCategory: byCategory.map((r) => ({ category: r.category, bookings: r.bookings, revenue: Number(r.revenue) })),
    topWorkers: topWorkers.map((r) => ({
      id: r.id,
      name: r.name,
      rating: Number(r.rating),
      completed: r.completed,
      total: r.total,
      revenue: Number(r.revenue)
    }))
  };
}