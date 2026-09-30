import { pool } from "../db/pool";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  is_read: boolean;
  created_at: Date;
}

export function mapNotificationRow(row: Record<string, unknown>): NotificationRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as string,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    data: row.data ?? null,
    is_read: row.is_read as boolean,
    created_at: new Date(row.created_at as string)
  };
}

export async function insertNotification(
  userId: string,
  type: string,
  title: string,
  body: string | null,
  data?: unknown
): Promise<NotificationRow> {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body, data != null ? JSON.stringify(data) : null]
  );
  return mapNotificationRow(rows[0]);
}

export interface ListNotificationsFilter {
  unreadOnly?: boolean;
  limit: number;
  offset: number;
}

export async function listNotifications(
  userId: string,
  filter: ListNotificationsFilter
): Promise<NotificationRow[]> {
  const args: unknown[] = [userId];
  let where = "user_id = $1";
  if (filter.unreadOnly) {
    args.push(true);
    where += " AND is_read = $2";
  }
  args.push(filter.limit, filter.offset);
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows.map(mapNotificationRow);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return Number(rows[0].count);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<NotificationRow | null> {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] ? mapNotificationRow(rows[0]) : null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id`,
    [userId]
  );
  return rows.length;
}