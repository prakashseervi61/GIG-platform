import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../models/notification.model";

export async function listMyNotifications(user: AuthUser, query: { unreadOnly?: boolean; limit: number; offset: number }) {
  const rows = await listNotifications(user.sub, query);
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    isRead: n.is_read,
    createdAt: n.created_at
  }));
}

export async function getUnreadCount(user: AuthUser) {
  return getUnreadNotificationCount(user.sub);
}

export async function markRead(user: AuthUser, notificationId: string) {
  const updated = await markNotificationRead(user.sub, notificationId);
  if (!updated) {
    throw ApiError.notFound("NOTIFICATION_NOT_FOUND", "Notification not found");
  }
  return updated;
}

export async function markAllRead(user: AuthUser) {
  return markAllNotificationsRead(user.sub);
}