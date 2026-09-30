import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";

export interface DailySeriesRow {
  zone: string;
  category: string;
  date: string;
  requests: number;
  emergency: number;
}

export interface ZoneCoopRow {
  id: string;
  name: string;
}

export async function getZoneCoopNames(): Promise<ZoneCoopRow[]> {
  const { rows } = await pool.query(
    `SELECT id, name FROM cooperatives ORDER BY name ASC`
  );
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
}

export async function getZonesInScope(coopIds: string[] | null): Promise<string[]> {
  if (!coopIds) {
    return getZoneCoopNames().then((rows) => rows.map((r) => r.name));
  }
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM cooperatives WHERE id = ANY($1::uuid[]) ORDER BY name ASC`,
    [coopIds]
  );
  return rows.map((r) => r.name);
}

export interface IngestDailyInput {
  zone: string;
  category: string;
  date: string;
  emergency: boolean;
}

export async function ingestBookingDaily(input: IngestDailyInput): Promise<void> {
  await pool.query(
    `INSERT INTO forecast_daily (zone, service_category, service_date, requests, emergency_requests)
     VALUES ($1, $2, $3, 1, CASE WHEN $4 THEN 1 ELSE 0 END)
     ON CONFLICT (zone, service_category, service_date)
     DO UPDATE SET
       requests = forecast_daily.requests + CASE WHEN $4 THEN 0 ELSE 1 END,
       emergency_requests = forecast_daily.emergency_requests + CASE WHEN $4 THEN 1 ELSE 0 END,
       updated_at = now()`,
    [input.zone, input.category, input.date, input.emergency]
  );
}

export async function rebuildForecastDataset(actorId: string | null): Promise<{ records: number }> {
  return withTransaction(async (client) => {
    await client.query("DELETE FROM forecast_daily");
    const { rows } = await client.query<{ count: string }>(
      `INSERT INTO forecast_daily (zone, service_category, service_date, requests, emergency_requests)
       SELECT COALESCE(c.name, 'UNAFFILIATED') AS zone,
              s.category AS service_category,
              b.created_at::date AS service_date,
              count(*)::int AS requests,
              count(*) FILTER (WHERE b.priority = 'emergency')::int AS emergency_requests
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       LEFT JOIN cooperatives c ON c.id = b.cooperative_id
       GROUP BY 1, 2, 3
       RETURNING id`
    );
    await client.query(
      `INSERT INTO forecast_runs (run_type, actor_id, summary) VALUES ('rebuild', $1, $2)`,
      [actorId, JSON.stringify({ records: rows.length, at: new Date().toISOString() })]
    );
    return { records: rows.length };
  });
}

export async function logValidationRun(input: {
  actorId: string | null;
  zone: string;
  summary: Record<string, unknown>;
  metrics: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO forecast_runs (run_type, actor_id, zone, summary, metrics)
     VALUES ('validation', $1, $2, $3, $4)`,
    [input.actorId, input.zone, JSON.stringify(input.summary), JSON.stringify(input.metrics)]
  );
}

export interface SeriesFilter {
  zones: string[] | null;
  category?: string | null;
  startDate: string;
  endDate: string;
}

export async function loadDailySeries(filter: SeriesFilter): Promise<DailySeriesRow[]> {
  const args: unknown[] = [filter.startDate, filter.endDate];
  let zoneClause = "";
  if (filter.zones) {
    if (filter.zones.length === 0) return [];
    args.push(filter.zones);
    zoneClause = `AND zone = ANY($${args.length}::text[])`;
  }
  let categoryClause = "";
  if (filter.category) {
    args.push(filter.category);
    categoryClause = `AND service_category = $${args.length}`;
  }
  const { rows } = await pool.query(
    `SELECT zone, service_category AS category, to_char(service_date, 'YYYY-MM-DD') AS date,
            requests, emergency_requests AS emergency
     FROM forecast_daily
     WHERE service_date >= $1::date AND service_date <= $2::date
       ${zoneClause}
       ${categoryClause}
     ORDER BY service_date ASC`,
    args
  );
  return rows.map((r) => ({
    zone: r.zone as string,
    category: r.category as string,
    date: r.date as string,
    requests: r.requests as number,
    emergency: r.emergency as number
  }));
}

export async function countAvailableWorkersForCategory(scope: {
  coopIds: string[] | null;
  zoneName?: string;
  category: string;
}): Promise<number> {
  if (scope.coopIds && scope.coopIds.length === 0) return 0;
  const args: unknown[] = [scope.category];
  let coopClause = "";
  if (scope.coopIds) {
    args.push(scope.coopIds);
    coopClause = `AND (w.cooperative_id IS NULL OR w.cooperative_id = ANY($${args.length}::uuid[]))`;
  } else if (scope.zoneName) {
    if (scope.zoneName === "UNAFFILIATED") {
      coopClause = `AND w.cooperative_id IS NULL`;
    } else {
      args.push(scope.zoneName);
      coopClause = `AND w.cooperative_id = (SELECT id FROM cooperatives WHERE name = $${args.length})`;
    }
  }
  const { rows } = await pool.query<{ count: number }>(
    `SELECT count(DISTINCT w.id)::int AS count
     FROM workers w
     JOIN worker_skills ws ON ws.worker_id = w.id
     JOIN skills sk ON sk.id = ws.skill_id
     WHERE sk.category = $1
       AND w.verification_status = 'approved'
       AND w.is_available = true
       ${coopClause}`,
    args
  );
  return rows[0].count;
}