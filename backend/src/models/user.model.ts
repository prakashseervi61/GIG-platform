import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";
import type { UserRow } from "../schemas/auth.schema";
import type { UserRole } from "../types";

export const USER_COLUMNS = `
  id, name, phone, email, password_hash, role, language, is_active,
  created_at, updated_at
`;

export async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE phone = $1 OR email = $1`,
    [identifier]
  );
  return rows[0] ?? null;
}

async function insertUser(client: PoolClient, input: {
  name: string;
  phone: string | null;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  language: string;
}): Promise<UserRow> {
  const { rows } = await client.query<UserRow>(
    `INSERT INTO users (name, phone, email, password_hash, role, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${USER_COLUMNS}`,
    [input.name, input.phone, input.email, input.passwordHash, input.role, input.language]
  );
  return rows[0];
}

async function insertWorker(client: PoolClient, userId: string, cooperativeId: string | null): Promise<void> {
  await client.query(
    `INSERT INTO workers (user_id, cooperative_id) VALUES ($1, $2)`,
    [userId, cooperativeId]
  );
}

export const createUserWithWorker = (input: {
  name: string;
  phone: string | null;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  language: string;
}) =>
  withTransaction(async (client: PoolClient) => {
    const user = await insertUser(client, input);
    if (input.role === "worker") {
      await insertWorker(client, user.id, null);
    }
    return user;
  });