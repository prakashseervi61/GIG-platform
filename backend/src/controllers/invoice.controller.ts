import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";
import { getInvoiceForUser, listInvoicesForUser } from "../services/payment.service";
import type { ListInvoicesQueryInput } from "../schemas/payment.schema";

const list = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ListInvoicesQueryInput) ?? {};
  const invoices = await listInvoicesForUser(user, query);
  res.status(200).json({ invoices, count: invoices.length });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const invoice = await getInvoiceForUser(user, id);
  res.status(200).json({ invoice });
});

export const invoiceController = { list, getById };