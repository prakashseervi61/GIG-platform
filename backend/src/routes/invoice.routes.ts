import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { invoiceController } from "../controllers/invoice.controller";
import { invoiceIdParamSchema, listInvoicesQuerySchema } from "../schemas/payment.schema";

export const invoiceRouter = Router();

invoiceRouter.get("/", authenticate, validate(listInvoicesQuerySchema, "query"), invoiceController.list);
invoiceRouter.get("/:id", authenticate, validate(invoiceIdParamSchema, "params"), invoiceController.getById);