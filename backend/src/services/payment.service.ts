import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import { getBookingById } from "../models/booking.model";
import { getCooperativesManagedByAdmin } from "../models/worker.model";
import { getOwnWorkerId } from "./worker.service";
import { insertNotification } from "../models/notification.model";
import {
  completePaymentAndIssueInvoice,
  failPayment,
  generatePaymentNumber,
  getInvoiceById,
  getPaymentByBookingId,
  getPaymentById,
  insertPaymentRecord,
  invoiceToApi,
  listInvoices,
  listPayments,
  logPaymentEvent,
  paymentToApi,
  resetPaymentForRetry,
  type InvoiceApi,
  type PaymentApi,
  type PaymentMethod
} from "../models/payment.model";
import type {
  CreatePaymentInput,
  ListInvoicesQueryInput,
  ListPaymentsQueryInput,
  VerifyPaymentInput
} from "../schemas/payment.schema";

const PAYABLE_BOOKING_STATUSES = new Set(["accepted", "in_progress", "completed"]);

function assertRole(condition: boolean, message: string): void {
  if (!condition) {
    throw ApiError.forbidden("FORBIDDEN", message);
  }
}

export async function createSandboxPayment(user: AuthUser, input: CreatePaymentInput): Promise<PaymentApi> {
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    throw ApiError.notFound("BOOKING_NOT_FOUND", "Booking not found");
  }
  assertRole(booking.customerId === user.sub, "You can only pay for your own bookings");
  if (!PAYABLE_BOOKING_STATUSES.has(booking.status)) {
    throw ApiError.badRequest(
      "BOOKING_NOT_PAYABLE",
      `Payments can start once the booking is ${Array.from(PAYABLE_BOOKING_STATUSES).join(" / ")} (currently ${booking.status})`
    );
  }

  const existing = await getPaymentByBookingId(booking.id);
  if (existing) {
    if (existing.status === "completed") {
      await logPaymentEvent(existing.id, user.sub, "create_duplicate_after_paid", { bookingId: booking.id });
      throw ApiError.conflict("ALREADY_PAID", "This booking has already been paid");
    }
    if (existing.status === "pending") {
      await logPaymentEvent(existing.id, user.sub, "create_resumed", { bookingId: booking.id });
      return paymentToApi(existing);
    }
    // failed/refunded -> re-issue a fresh sandbox order on the same (unique) payment row.
    await resetPaymentForRetry(existing.id, input.method);
    await logPaymentEvent(existing.id, user.sub, "create_retry", { bookingId: booking.id });
    const refreshed = await getPaymentById(existing.id);
    return paymentToApi(refreshed!);
  }

  const payment = await insertPaymentRecord({
    paymentNumber: generatePaymentNumber(),
    bookingId: booking.id,
    customerId: user.sub,
    workerId: booking.workerId,
    amount: booking.price,
    method: input.method,
    providerOrderId: `SANDBOX-${crypto.randomUUID()}`
  });
  await logPaymentEvent(payment.id, user.sub, "create", {
    bookingId: booking.id,
    amount: booking.price,
    method: input.method
  });
  const created = await getPaymentById(payment.id);
  return paymentToApi(created!);
}

export async function verifySandboxPayment(user: AuthUser, input: VerifyPaymentInput): Promise<{
  payment: PaymentApi;
  invoice: InvoiceApi;
}> {
  const payment = await getPaymentById(input.paymentId);
  if (!payment) {
    throw ApiError.notFound("PAYMENT_NOT_FOUND", "Payment not found");
  }
  assertRole(payment.customer_id === user.sub, "You can only verify your own payments");

  if (payment.status === "completed") {
    await logPaymentEvent(payment.id, user.sub, "verify_replay_attempt", { bookingId: payment.booking_id });
    throw ApiError.conflict("ALREADY_VERIFIED", "This payment was already verified (replay blocked)");
  }
  if (payment.status !== "pending") {
    throw ApiError.conflict("PAYMENT_NOT_VERIFIABLE", `Payment is ${payment.status} and cannot be verified`);
  }

  const booking = await getBookingById(payment.booking_id);
  if (!booking || !PAYABLE_BOOKING_STATUSES.has(booking.status)) {
    await logPaymentEvent(payment.id, user.sub, "verify_state_guard", { bookingStatus: booking?.status ?? "missing" });
    throw ApiError.badRequest("BOOKING_NOT_PAYABLE", "Booking is no longer in a payable state");
  }

  const subtotal = booking.serviceBasePrice;
  const total = booking.price;
  const emergencySurcharge = Math.round((total - subtotal) * 100) / 100;
  const taxRate = 0;
  const taxAmount = 0;

  const result = await completePaymentAndIssueInvoice({
    payment,
    booking: {
      id: booking.id,
      customerId: booking.customerId,
      customerName: booking.customerName,
      workerId: booking.workerId,
      workerName: booking.workerName,
      cooperativeId: booking.cooperativeId,
      serviceName: booking.serviceName,
      subTotal: subtotal,
      emergencySurcharge,
      taxRate,
      taxAmount,
      total
    }
  });

  const { payment: paid, invoice } = result;
  if (booking.workerUserId) {
    await insertNotification(
      booking.workerUserId,
      "payment_success",
      "Payment received",
      `Payment of ₹${total.toFixed(2)} received for booking ${booking.bookingNumber}. Invoice ${invoice.invoice_number} issued.`,
      { bookingId: booking.id, paymentId: paid.id, invoiceId: invoice.id, amount: total }
    );
  }
  await insertNotification(
    booking.customerId,
    "payment_success",
    "Payment successful",
    `Payment of ₹${total.toFixed(2)} for booking ${booking.bookingNumber} succeeded. Invoice ${invoice.invoice_number}.`,
    { bookingId: booking.id, paymentId: paid.id, invoiceId: invoice.id, amount: total }
  );

  await logPaymentEvent(paid.id, user.sub, "verify_success", {
    bookingId: booking.id,
    invoiceNumber: invoice.invoice_number,
    transactionId: paid.transaction_id
  });

  const paidApi = await getPaymentById(paid.id);
  return { payment: paymentToApi(paidApi!), invoice: invoiceToApi(invoice) };
}

export async function listPaymentsForUser(user: AuthUser, query: ListPaymentsQueryInput): Promise<PaymentApi[]> {
  const base = { status: query.status, limit: query.limit, offset: query.offset };
  const rows = await (async () => {
    switch (user.role) {
      case "customer":
        return listPayments({ ...base, customerId: user.sub });
      case "worker":
        return listPayments({ ...base, workerId: await getOwnWorkerId(user.sub) });
      case "coop_admin": {
        const coops = await getCooperativesManagedByAdmin(user.sub);
        return listPayments({ ...base, cooperativeIds: coops.map((c) => c.id) });
      }
      default:
        return listPayments(base);
    }
  })();
  return rows.map((r) => paymentToApi(r));
}

export async function getPaymentForUser(user: AuthUser, paymentId: string): Promise<PaymentApi> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw ApiError.notFound("PAYMENT_NOT_FOUND", "Payment not found");
  }
  const booking = await getBookingById(payment.booking_id);
  switch (user.role) {
    case "customer":
      assertRole(payment.customer_id === user.sub, "You can only view your own payments");
      return paymentToApi(payment);
    case "worker": {
      const workerId = await getOwnWorkerId(user.sub);
      assertRole(payment.worker_id === workerId, "You can only view payments for your own work");
      return paymentToApi(payment);
    }
    case "coop_admin": {
      const coops = await getCooperativesManagedByAdmin(user.sub);
      assertRole(coops.some((c) => c.id === booking?.cooperativeId), "You can only view payments of your cooperative");
      return paymentToApi(payment);
    }
    default:
      return paymentToApi(payment);
  }
}

export async function listInvoicesForUser(user: AuthUser, query: ListInvoicesQueryInput): Promise<InvoiceApi[]> {
  const base = { status: query.status, limit: query.limit, offset: query.offset };
  const rows = await (async () => {
    switch (user.role) {
      case "customer":
        return listInvoices({ ...base, customerId: user.sub });
      case "worker":
        return listInvoices({ ...base, workerId: await getOwnWorkerId(user.sub) });
      case "coop_admin": {
        const coops = await getCooperativesManagedByAdmin(user.sub);
        return listInvoices({ ...base, cooperativeIds: coops.map((c) => c.id) });
      }
      default:
        return listInvoices(base);
    }
  })();
  return rows.map((r) => invoiceToApi(r));
}

export async function getInvoiceForUser(user: AuthUser, invoiceId: string): Promise<InvoiceApi> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw ApiError.notFound("INVOICE_NOT_FOUND", "Invoice not found");
  }
  switch (user.role) {
    case "customer":
      assertRole(invoice.customer_id === user.sub, "You can only view your own invoices");
      return invoiceToApi(invoice);
    case "worker": {
      const workerId = await getOwnWorkerId(user.sub);
      assertRole(invoice.worker_id === workerId, "You can only view invoices for your own work");
      return invoiceToApi(invoice);
    }
    case "coop_admin": {
      const coops = await getCooperativesManagedByAdmin(user.sub);
      assertRole(coops.some((c) => c.id === invoice.cooperative_id), "You can only view invoices of your cooperative");
      return invoiceToApi(invoice);
    }
    default:
      return invoiceToApi(invoice);
  }
}

export { failPayment };
export type { PaymentMethod };