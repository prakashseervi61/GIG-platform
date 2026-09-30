import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";
import {
  createSandboxPayment,
  getPaymentForUser,
  listPaymentsForUser,
  verifySandboxPayment
} from "../services/payment.service";
import type { CreatePaymentInput, ListPaymentsQueryInput, VerifyPaymentInput } from "../schemas/payment.schema";

const create = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const body = req.validated?.body as CreatePaymentInput;
  const payment = await createSandboxPayment(user, body);
  res.status(201).json({ message: "Sandbox payment order created", payment });
});

const verify = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const body = req.validated?.body as VerifyPaymentInput;
  const { payment, invoice } = await verifySandboxPayment(user, body);
  res.status(200).json({ message: "Payment verified - invoice generated", payment, invoice });
});

const list = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ListPaymentsQueryInput) ?? {};
  const payments = await listPaymentsForUser(user, query);
  res.status(200).json({ payments, count: payments.length });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const payment = await getPaymentForUser(user, id);
  res.status(200).json({ payment });
});

export const paymentController = { create, verify, list, getById };