import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";
import type { AddCertificationInput } from "../schemas/worker.schema";

export interface WorkerRow {
  id: string;
  user_id: string;
  cooperative_id: string | null;
  experience_years: number;
  verification_status: "pending" | "approved" | "rejected";
  verified_at: Date | null;
  verified_by: string | null;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  rating: number;
  rating_count: number;
  reliability: number;
  hourly_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  cooperativeId: string | null;
  cooperativeName: string | null;
  experienceYears: number;
  hourlyRate: number;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: WorkerRow["verification_status"];
  isAvailable: boolean;
  rating: number;
  ratingCount: number;
  reliability: number;
  skillCount: number;
  verifiedCertCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkerProfileModelRow extends WorkerRow {
  user_name: string;
  phone: string | null;
  email: string | null;
  cooperative_name: string | null;
  skill_count: number;
  verified_cert_count: number;
}

const PROFILE_SELECT = `
  w.*, u.name AS user_name, u.phone, u.email,
  c.name AS cooperative_name,
  (SELECT count(*)::int FROM worker_skills ws WHERE ws.worker_id = w.id) AS skill_count,
  (SELECT count(*)::int FROM certifications c2
    WHERE c2.worker_id = w.id AND c2.verification_status = 'approved') AS verified_cert_count
`;

function mapWorkerProfile(row: WorkerProfileModelRow): WorkerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.user_name,
    phone: row.phone,
    email: row.email,
    cooperativeId: row.cooperative_id,
    cooperativeName: row.cooperative_name,
    experienceYears: row.experience_years,
    hourlyRate: Number(row.hourly_rate),
    latitude: row.latitude,
    longitude: row.longitude,
    verificationStatus: row.verification_status,
    isAvailable: row.is_available,
    rating: Number(row.rating),
    ratingCount: row.rating_count,
    reliability: Number(row.reliability),
    skillCount: row.skill_count,
    verifiedCertCount: row.verified_cert_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getWorkerByUserId(userId: string): Promise<WorkerRow | null> {
  const { rows } = await pool.query<WorkerRow>("SELECT * FROM workers WHERE user_id = $1", [userId]);
  return rows[0] ?? null;
}

export async function getWorkerById(id: string): Promise<WorkerRow | null> {
  const { rows } = await pool.query<WorkerRow>("SELECT * FROM workers WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getWorkerProfile(id: string): Promise<WorkerProfile | null> {
  const { rows } = await pool.query<WorkerProfileModelRow>(
    `SELECT ${PROFILE_SELECT}
     FROM workers w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN cooperatives c ON c.id = w.cooperative_id
     WHERE w.id = $1`,
    [id]
  );
  return rows[0] ? mapWorkerProfile(rows[0]) : null;
}

const PROFILE_UPDATE_FIELD_MAP: Record<string, string> = {
  experienceYears: "experience_years",
  hourlyRate: "hourly_rate",
  latitude: "latitude",
  longitude: "longitude",
  cooperativeId: "cooperative_id"
};

export async function updateWorkerProfile(
  workerId: string,
  fields: Partial<Record<keyof typeof PROFILE_UPDATE_FIELD_MAP, number | string | null>>
): Promise<WorkerRow> {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    const worker = await getWorkerById(workerId);
    if (!worker) throw new Error("Worker not found");
    return worker;
  }
  const setClause = entries
    .map(([key], index) => `${PROFILE_UPDATE_FIELD_MAP[key]} = $${index + 1}`)
    .join(", ");
  const values = entries.map(([, value]) => value);
  const { rows } = await pool.query<WorkerRow>(
    `UPDATE workers SET ${setClause}, updated_at = now() WHERE id = $${entries.length + 1} RETURNING *`,
    [...values, workerId]
  );
  return rows[0];
}

export async function setWorkerAvailability(
  workerId: string,
  isAvailable: boolean,
  latitude?: number,
  longitude?: number
): Promise<WorkerRow> {
  const { rows } = await pool.query<WorkerRow>(
    `UPDATE workers
     SET is_available = $2,
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [workerId, isAvailable, latitude ?? null, longitude ?? null]
  );
  return rows[0];
}

export async function workerHasSkill(workerId: string, skillId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM worker_skills WHERE worker_id = $1 AND skill_id = $2) AS exists",
    [workerId, skillId]
  );
  return rows[0].exists;
}

export async function addWorkerSkill(
  workerId: string,
  skillId: string,
  experienceLevel: number
): Promise<void> {
  await pool.query(
    `INSERT INTO worker_skills (worker_id, skill_id, experience_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (worker_id, skill_id) DO UPDATE SET experience_level = EXCLUDED.experience_level`,
    [workerId, skillId, experienceLevel]
  );
}

export async function removeWorkerSkill(workerId: string, skillId: string): Promise<void> {
  await pool.query("DELETE FROM worker_skills WHERE worker_id = $1 AND skill_id = $2", [
    workerId,
    skillId
  ]);
}

export async function getWorkerSkills(workerId: string) {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.category, s.description, ws.experience_level AS experienceLevel
     FROM worker_skills ws
     JOIN skills s ON s.id = ws.skill_id
     WHERE ws.worker_id = $1
     ORDER BY s.category, s.name`,
    [workerId]
  );
  return rows;
}

export async function addCertification(workerId: string, input: AddCertificationInput) {
  const { rows } = await pool.query(
    `INSERT INTO certifications (worker_id, issuer, certificate_number, issue_date, validity, document_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, worker_id AS "workerId", issuer, certificate_number AS "certificateNumber",
       issue_date AS "issueDate", validity, document_url AS "documentUrl",
       verification_status AS "verificationStatus", created_at AS "createdAt"`,
    [
      workerId,
      input.issuer,
      input.certificateNumber ?? null,
      input.issueDate ?? null,
      input.validity ?? null,
      input.documentUrl ?? null
    ]
  );
  return rows[0];
}

export async function listCertifications(workerId: string) {
  const { rows } = await pool.query(
    `SELECT id, worker_id AS "workerId", issuer, certificate_number AS "certificateNumber",
       issue_date AS "issueDate", validity, document_url AS "documentUrl",
       verification_status AS "verificationStatus", verified_at AS "verifiedAt",
       created_at AS "createdAt"
     FROM certifications
     WHERE worker_id = $1
     ORDER BY created_at DESC`,
    [workerId]
  );
  return rows;
}

export async function getCertification(certId: string, workerId: string) {
  const { rows } = await pool.query(
    "SELECT * FROM certifications WHERE id = $1 AND worker_id = $2",
    [certId, workerId]
  );
  return rows[0] ?? null;
}

export async function updateCertificationStatus(
  certId: string,
  workerId: string,
  status: "approved" | "rejected",
  verifiedBy: string
) {
  const { rows } = await pool.query(
    `UPDATE certifications
     SET verification_status = $1, verified_by = $3, verified_at = now(), updated_at = now()
     WHERE id = $2 AND worker_id = $4
     RETURNING id, verification_status AS "verificationStatus"`,
    [status, certId, verifiedBy, workerId]
  );
  return rows[0] ?? null;
}

export interface AdminWorkerRow {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  cooperativeId: string | null;
  cooperativeName: string | null;
  experienceYears: number;
  verificationStatus: WorkerRow["verification_status"];
  isAvailable: boolean;
  rating: number;
  ratingCount: number;
  skillCount: number;
  pendingCertCount: number;
  createdAt: Date;
}

export async function listWorkersAdmin(opts: {
  status?: string;
  cooperativeId?: string;
  search?: string;
  restrictToCoops: boolean;
  coopIds: string[];
}): Promise<AdminWorkerRow[]> {
  const { rows } = await pool.query(
    `SELECT w.id, w.user_id AS "userId", u.name, u.phone, u.email,
       w.cooperative_id AS "cooperativeId", c.name AS "cooperativeName",
       w.experience_years AS "experienceYears",
       w.verification_status AS "verificationStatus",
       w.is_available AS "isAvailable", w.rating, w.rating_count AS "ratingCount",
       (SELECT count(*)::int FROM worker_skills ws WHERE ws.worker_id = w.id) AS "skillCount",
       (SELECT count(*)::int FROM certifications c2
         WHERE c2.worker_id = w.id AND c2.verification_status = 'pending') AS "pendingCertCount",
       w.created_at AS "createdAt"
     FROM workers w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN cooperatives c ON c.id = w.cooperative_id
     WHERE ($1::text IS NULL OR w.verification_status = $1)
       AND ($2::uuid IS NULL OR w.cooperative_id = $2)
       AND ($3::text IS NULL OR u.name ILIKE '%' || $3 || '%' OR u.phone ILIKE '%' || $3 || '%')
       AND ($4::boolean = false OR w.cooperative_id IS NULL OR w.cooperative_id = ANY($5::uuid[]))
     ORDER BY w.created_at DESC`,
    [
      opts.status ?? null,
      opts.cooperativeId ?? null,
      opts.search ?? null,
      opts.restrictToCoops,
      opts.coopIds
    ]
  );
  return rows;
}

export async function listSkillsCatalog() {
  const { rows } = await pool.query(
    `SELECT id, name, category, description FROM skills ORDER BY category, name`
  );
  return rows;
}

export async function getSkillById(skillId: string) {
  const { rows } = await pool.query("SELECT id, name, category FROM skills WHERE id = $1", [skillId]);
  return rows[0] ?? null;
}

export async function cooperativeExists(cooperativeId: string) {
  const { rows } = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM cooperatives WHERE id = $1) AS exists",
    [cooperativeId]
  );
  return rows[0].exists;
}

export async function updateWorkerReliability(workerId: string): Promise<void> {
  await pool.query(
    `UPDATE workers w
     SET reliability = sub.value, updated_at = now()
     FROM (
       SELECT round(
         (count(*) FILTER (WHERE status = 'completed')::numeric
          / NULLIF(count(*) FILTER (WHERE status IN ('completed', 'cancelled', 'rejected')), 0))
         * 5, 2
       ) AS value
       FROM bookings
       WHERE worker_id = $1
     ) sub
     WHERE w.id = $1`,
    [workerId]
  );
}

export async function getCooperativesManagedByAdmin(adminUserId: string) {
  const { rows } = await pool.query<{ id: string; name: string }>(
    "SELECT id, name FROM cooperatives WHERE admin_user_id = $1",
    [adminUserId]
  );
  return rows;
}

export const changeWorkerVerification = (workerId: string, status: "approved" | "rejected", verifiedBy: string, note?: string) =>
  withTransaction(async (client) => {
    const { rows } = await client.query<WorkerRow>(
      `UPDATE workers
       SET verification_status = $1, verified_by = $3, verified_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, workerId, verifiedBy]
    );
    if (!rows[0]) {
      throw new Error("Worker not found");
    }

    await client.query(
      `INSERT INTO verification_log (worker_id, action, performed_by, note)
       VALUES ($1, $2, $3, $4)`,
      [workerId, status, verifiedBy, note ?? null]
    );

    const title =
      status === "approved" ? "Worker profile approved" : "Worker profile rejected";
    const body =
      status === "approved"
        ? "Your worker profile has been verified and you can now receive bookings."
        : `Your worker profile was not approved.${note ? ` Reason: ${note}` : ""}`;

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ((SELECT user_id FROM workers WHERE id = $1), 'worker_verification', $2, $3, $4::jsonb)`,
      [workerId, title, body, JSON.stringify({ workerId, status })]
    );

    return rows[0];
  });