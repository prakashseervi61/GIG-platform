import { pool } from "../db/pool";

export interface ServiceRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price: string;
  emergency_available: boolean;
  is_active: boolean;
  /** Real demand signal: bookings that were not cancelled or rejected. */
  booking_count: number;
  skills: { skillId: string; name: string }[];
}

export const SERVICE_SELECT = `
  s.id,
  s.name,
  s.category,
  s.description,
  s.base_price,
  s.emergency_available,
  s.is_active,
  (
    SELECT COUNT(*)::int
    FROM bookings b
    WHERE b.service_id = s.id
      AND b.status NOT IN ('cancelled', 'rejected')
  ) AS booking_count,
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('skillId', sk.id, 'name', sk.name) ORDER BY sk.name)
      FROM service_skills ssk
      JOIN skills sk ON sk.id = ssk.skill_id
      WHERE ssk.service_id = s.id
    ),
    '[]'::jsonb
  ) AS skills
`;

export function mapServiceRow(row: unknown): ServiceRow {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    description: r.description as string | null,
    base_price: r.base_price as string,
    emergency_available: r.emergency_available as boolean,
    is_active: r.is_active as boolean,
    booking_count: Number(r.booking_count ?? 0),
    skills: (r.skills as { skillId: string; name: string }[]) ?? []
  };
}

export async function listServices(
  filter: { category?: string; search?: string; sort?: "popular" }
): Promise<ServiceRow[]> {
  const where: string[] = ["s.is_active = true"];
  const params: unknown[] = [];
  if (filter.category) {
    params.push(filter.category);
    where.push(`s.category = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`s.name ILIKE $${params.length}`);
  }
  // "popular" ranks by real booking demand; the default keeps the stable
  // category/name order the browse pages were built around.
  const orderBy =
    filter.sort === "popular" ? "ORDER BY booking_count DESC, s.name" : "ORDER BY s.category, s.name";
  const { rows } = await pool.query(
    `SELECT ${SERVICE_SELECT}
     FROM services s
     WHERE ${where.join(" AND ")}
     ${orderBy}`,
    params
  );
  return rows.map(mapServiceRow);
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  const { rows } = await pool.query(
    `SELECT ${SERVICE_SELECT}
     FROM services s
     WHERE s.id = $1 AND s.is_active = true`,
    [id]
  );
  return rows[0] ? mapServiceRow(rows[0]) : null;
}

export async function getServiceSkillIds(serviceId: string): Promise<string[]> {
  const { rows } = await pool.query<{ skill_id: string }>(
    `SELECT skill_id FROM service_skills WHERE service_id = $1`,
    [serviceId]
  );
  return rows.map((r) => r.skill_id);
}