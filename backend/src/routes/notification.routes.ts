import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { notificationController } from "../controllers/notification.controller";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "../schemas/booking.schema";

export const notificationRouter = Router();

notificationRouter.get("/", authenticate, validate(listNotificationsQuerySchema, "query"), notificationController.listMe);
notificationRouter.get("/unread-count", authenticate, notificationController.unreadCount);
notificationRouter.patch("/read-all", authenticate, notificationController.readAll);
notificationRouter.patch(
  "/:id/read",
  authenticate,
  validate(notificationIdParamSchema, "params"),
  notificationController.readOne
);