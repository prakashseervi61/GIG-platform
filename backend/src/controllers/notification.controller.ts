import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";
import { getUnreadCount, listMyNotifications, markAllRead, markRead } from "../services/notification.service";
import type { ListNotificationsQueryInput } from "../schemas/booking.schema";

const listMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ListNotificationsQueryInput) ?? {};
  const notifications = await listMyNotifications(user, query);
  res.status(200).json({ notifications, count: notifications.length });
});

const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const count = await getUnreadCount(user);
  res.status(200).json({ unreadCount: count });
});

const readOne = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  await markRead(user, id);
  res.status(200).json({ message: "Notification marked as read" });
});

const readAll = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const count = await markAllRead(user);
  res.status(200).json({ message: "All notifications marked as read", marked: count });
});

export const notificationController = { listMe, unreadCount, readOne, readAll };