import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paymentController } from "../controllers/payment.controller";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema,
  verifyPaymentSchema
} from "../schemas/payment.schema";

export const paymentRouter = Router();

paymentRouter.post("/create", authenticate, requireRole("customer"), validate(createPaymentSchema), paymentController.create);
paymentRouter.post("/verify", authenticate, requireRole("customer"), validate(verifyPaymentSchema), paymentController.verify);
paymentRouter.get("/", authenticate, validate(listPaymentsQuerySchema, "query"), paymentController.list);
paymentRouter.get("/:id", authenticate, validate(paymentIdParamSchema, "params"), paymentController.getById);