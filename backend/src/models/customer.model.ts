import { pool } from "../db/pool";

export interface CustomerLocationRow {
  id: string;
  user_id: string;
  label: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerLocationInput {
  userId: string;
  label?: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export async function getCustomerLocation(userId: string): Promise<CustomerLocationRow | null> {
  const { rows } = await pool.query(`SELECT * FROM customer_locations WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function upsertCustomerLocation(input: CustomerLocationInput): Promise<CustomerLocationRow> {
  const { rows } = await pool.query(
    `INSERT INTO customer_locations (user_id, label, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       label = EXCLUDED.label,
       address = EXCLUDED.address,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       updated_at = now()
     RETURNING *`,
    [input.userId, input.label ?? null, input.address, input.latitude, input.longitude]
  );
  return rows[0];
}

export interface CustomerAddressRow {
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerAddressInput {
  userId: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isDefault?: boolean;
}

const ADDRESS_COLUMNS = `id, user_id, label, address, latitude, longitude, is_default, created_at, updated_at`;

export async function listCustomerAddresses(userId: string): Promise<CustomerAddressRow[]> {
  const { rows } = await pool.query(
    `SELECT ${ADDRESS_COLUMNS} FROM customer_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC`,
    [userId]
  );
  return rows;
}

export async function getCustomerAddress(userId: string, id: string): Promise<CustomerAddressRow | null> {
  const { rows } = await pool.query(
    `SELECT ${ADDRESS_COLUMNS} FROM customer_addresses WHERE user_id = $1 AND id = $2`,
    [userId, id]
  );
  return rows[0] ?? null;
}

export async function createCustomerAddress(input: CustomerAddressInput): Promise<CustomerAddressRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // the first address a customer saves becomes their default
    const { rows: countRows } = await client.query(
      `SELECT count(*)::int AS c FROM customer_addresses WHERE user_id = $1`,
      [input.userId]
    );
    const makeDefault = input.isDefault === true || countRows[0].c === 0;

    if (makeDefault) {
      await client.query(`UPDATE customer_addresses SET is_default = false WHERE user_id = $1`, [input.userId]);
    }

    const { rows } = await client.query(
      `INSERT INTO customer_addresses (user_id, label, address, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${ADDRESS_COLUMNS}`,
      [input.userId, input.label, input.address, input.latitude, input.longitude, makeDefault]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateCustomerAddress(
  userId: string,
  id: string,
  patch: Partial<Omit<CustomerAddressInput, "userId">>
): Promise<CustomerAddressRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (col: string, val: unknown) => {
    values.push(val);
    sets.push(`${col} = $${values.length}`);
  };

  if (patch.label !== undefined) push("label", patch.label);
  if (patch.address !== undefined) push("address", patch.address);
  if (patch.latitude !== undefined) push("latitude", patch.latitude);
  if (patch.longitude !== undefined) push("longitude", patch.longitude);
  if (patch.isDefault !== undefined) push("is_default", patch.isDefault);
  if (sets.length === 0) return getCustomerAddress(userId, id);

  values.push(id, userId);
  const { rows } = await pool.query(
    `UPDATE customer_addresses SET ${sets.join(", ")}, updated_at = now()
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING ${ADDRESS_COLUMNS}`,
    values
  );
  return rows[0] ?? null;
}

/** Clears the current default then promotes the given address. */
export async function setDefaultCustomerAddress(userId: string, id: string): Promise<CustomerAddressRow | null> {
  const existing = await getCustomerAddress(userId, id);
  if (!existing) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE customer_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    const { rows } = await client.query(
      `UPDATE customer_addresses SET is_default = true, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING ${ADDRESS_COLUMNS}`,
      [id, userId]
    );
    await client.query("COMMIT");
    return rows[0] ?? null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteCustomerAddress(userId: string, id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: delRows } = await client.query(
      `DELETE FROM customer_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default`,
      [id, userId]
    );
    if (delRows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    // promote another address if we just removed the default
    if (delRows[0].is_default) {
      const { rows: nextRows } = await client.query(
        `UPDATE customer_addresses SET is_default = true
         WHERE id = (SELECT id FROM customer_addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [userId]
      );
      void nextRows;
    }
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}