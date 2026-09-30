import { pool } from "../db/pool";

export interface SearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
  serviceId?: string;
  category?: string;
  minRating?: number;
  maxPrice?: number;
  sort: "distance" | "rating" | "price";
}

export interface ApprovedWorkerResult {
  id: string;
  userId: string;
  cooperativeId: string | null;
  workerName: string;
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  ratingCount: number;
  reliability: number;
  cooperativeName: string | null;
  distanceKm: number;
  isAvailable: boolean;
  skills: { skillId: string; name: string; experienceLevel: number }[];
  completedBookings: number;
}

const SORT_SQL: Record<SearchParams["sort"], string> = {
  distance: "distance_km ASC, rating DESC, hourly_rate ASC",
  rating: "rating DESC, distance_km ASC, hourly_rate ASC",
  price: "hourly_rate ASC, rating DESC, distance_km ASC"
};

const TARGET = "ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography";

export async function searchApprovedWorkers(params: SearchParams): Promise<ApprovedWorkerResult[]> {
  const where: string[] = [
    "w.verification_status = 'approved'",
    "w.is_available = true",
    "w.location IS NOT NULL",
    `ST_DWithin(w.location, ${TARGET}, $3 * 1000)`
  ];
  const args: unknown[] = [params.lat, params.lng, params.radiusKm];

  if (params.serviceId) {
    args.push(params.serviceId);
    where.push(`
      EXISTS (
        SELECT 1 FROM service_skills ssv
        JOIN worker_skills wsk ON wsk.worker_id = w.id AND wsk.skill_id = ssv.skill_id
        WHERE ssv.service_id = $${args.length}
      )
    `);
  }

  if (params.category) {
    args.push(params.category);
    where.push(`
      EXISTS (
        SELECT 1 FROM worker_skills wsk2
        JOIN skills sk2 ON sk2.id = wsk2.skill_id
        WHERE wsk2.worker_id = w.id AND sk2.category = $${args.length}
      )
    `);
  }

  if (typeof params.minRating === "number") {
    args.push(params.minRating);
    where.push(`w.rating >= $${args.length}`);
  }

  if (typeof params.maxPrice === "number") {
    args.push(params.maxPrice);
    where.push(`w.hourly_rate <= $${args.length}`);
  }

  args.push(params.limit);

  const { rows } = await pool.query(
    `SELECT
       w.id,
       w.user_id,
       w.cooperative_id,
       u.name AS worker_name,
       w.experience_years,
       w.hourly_rate,
       w.rating,
       w.rating_count,
       w.reliability,
       w.is_available,
       COALESCE(c.name, '') AS cooperative_name,
       (ST_Distance(w.location, ${TARGET}) / 1000) AS distance_km,
       COALESCE(
         (
           SELECT jsonb_agg(
             jsonb_build_object(
               'skillId', s.id,
               'name', s.name,
               'experienceLevel', ws.experience_level
             ) ORDER BY ws.experience_level DESC
           )
           FROM worker_skills ws
           JOIN skills s ON s.id = ws.skill_id
           WHERE ws.worker_id = w.id
         ),
         '[]'::jsonb
       ) AS skills,
       (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.id AND b.status = 'completed') AS completed_bookings
     FROM workers w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN cooperatives c ON c.id = w.cooperative_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${SORT_SQL[params.sort]}
     LIMIT $${args.length}`,
    args
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    cooperativeId: r.cooperative_id ?? null,
    workerName: r.worker_name,
    experienceYears: Number(r.experience_years),
    hourlyRate: Number(r.hourly_rate),
    rating: Number(r.rating),
    ratingCount: Number(r.rating_count),
    reliability: Number(r.reliability),
    cooperativeName: r.cooperative_name || null,
    distanceKm: Math.round((Number(r.distance_km) + Number.EPSILON) * 1000) / 1000,
    isAvailable: r.is_available,
    skills: r.skills ?? [],
    completedBookings: Number(r.completed_bookings)
  }));
}