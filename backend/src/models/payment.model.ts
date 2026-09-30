import { pool } from "../db/pool";
import { withTransaction } from "../db/transaction";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";

export interface PaymentRow {
  id: string;
  payment_number: string;
  booking_id: string;
  customer_id: string;
  worker_id: string | null;
  amount: string;
  currency: string;
  method: string | null;
  provider: string;
  provider_order_id: string | null;
  transaction_id: string | null;
  status: PaymentStatus;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentDetails extends PaymentRow {
  booking_number: string;
  booking_status: string;
  service_name: string;
}

export interface PaymentApi {
  id: string;
  paymentNumber: string;
  bookingId: string;
  customerId: string;
  workerId: string | null;
  amount: number;
  currency: string;
  method: string | null;
  provider: string;
  providerOrderId: string | null;
  transactionId: string | null;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bookingNumber?: string;
  bookingStatus?: string;
  serviceName?: string;
}

export function paymentToApi(p: PaymentRow): PaymentApi {
  const extra = p as unknown as Partial<PaymentDetails>;
  return {
    id: p.id,
    paymentNumber: p.payment_number,
    bookingId: p.booking_id,
    customerId: p.customer_id,
    workerId: p.worker_id,
    amount: Number(p.amount),
    currency: p.currency,
    method: p.method,
    provider: p.provider,
    providerOrderId: p.provider_order_id,
    transactionId: p.transaction_id,
    status: p.status,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    bookingNumber: extra.booking_number,
    bookingStatus: extra.booking_status,
    serviceName: extra.service_name
  };
}

export function mapPaymentRow(row: Record<string, unknown>): PaymentRow {
  return {
    id: row.id as string,
    payment_number: row.payment_number as string,
    booking_id: row.booking_id as string,
    customer_id: row.customer_id as string,
    worker_id: (row.worker_id as string | null) ?? null,
    amount: String(row.amount),
    currency: row.currency as string,
    method: (row.method as string | null) ?? null,
    provider: row.provider as string,
    provider_order_id: (row.provider_order_id as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    status: row.status as PaymentStatus,
    paid_at: row.paid_at ? new Date(row.paid_at as string) : null,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string)
  };
}

const PAYMENT_SELECT = `
  SELECT p.*, b.booking_number, b.status AS booking_status, s.name AS service_name
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  JOIN services s ON s.id = b.service_id
`;

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  payment_id: string;
  booking_id: string;
  customer_id: string;
  worker_id: string | null;
  cooperative_id: string | null;
  service_name: string;
  customer_name: string;
  worker_name: string | null;
  subtotal: string;
  emergency_surcharge: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  currency: string;
  status: "issued" | "paid" | "cancelled";
  issued_at: Date;
  paid_at: Date | null;
  due_date: string | null;
  created_at: Date;
}

export function mapInvoiceRow(row: Record<string, unknown>): InvoiceRow {
  return {
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    payment_id: row.payment_id as string,
    booking_id: row.booking_id as string,
    customer_id: row.customer_id as string,
    worker_id: (row.worker_id as string | null) ?? null,
    cooperative_id: (row.cooperative_id as string | null) ?? null,
    service_name: row.service_name as string,
    customer_name: row.customer_name as string,
    worker_name: (row.worker_name as string | null) ?? null,
    subtotal: String(row.subtotal),
    emergency_surcharge: String(row.emergency_surcharge),
    tax_rate: String(row.tax_rate),
    tax_amount: String(row.tax_amount),
    total: String(row.total),
    currency: row.currency as string,
    status: row.status as InvoiceRow["status"],
    issued_at: new Date(row.issued_at as string),
    paid_at: row.paid_at ? new Date(row.paid_at as string) : null,
    due_date: (row.due_date as string | null) ?? null,
    created_at: new Date(row.created_at as string)
  };
}

export interface InvoiceApi {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  bookingId: string;
  customerId: string;
  workerId: string | null;
  cooperativeId: string | null;
  serviceName: string;
  customerName: string;
  workerName: string | null;
  subtotal: number;
  emergencySurcharge: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "issued" | "paid" | "cancelled";
  issuedAt: Date;
  paidAt: Date | null;
  dueDate: string | null;
  createdAt: Date;
}

export function invoiceToApi(i: InvoiceRow): InvoiceApi {
  return {
    id: i.id,
    invoiceNumber: i.invoice_number,
    paymentId: i.payment_id,
    bookingId: i.booking_id,
    customerId: i.customer_id,
    workerId: i.worker_id,
    cooperativeId: i.cooperative_id,
    serviceName: i.service_name,
    customerName: i.customer_name,
    workerName: i.worker_name,
    subtotal: Number(i.subtotal),
    emergencySurcharge: Number(i.emergency_surcharge),
    taxRate: Number(i.tax_rate),
    taxAmount: Number(i.tax_amount),
    total: Number(i.total),
    currency: i.currency,
    status: i.status,
    issuedAt: i.issued_at,
    paidAt: i.paid_at,
    dueDate: i.due_date,
    createdAt: i.created_at
  };
}

export interface InsertPaymentRecordInput {
  paymentNumber: string;
  bookingId: string;
  customerId: string;
  workerId: string | null;
  amount: number;
  method: PaymentMethod;
  providerOrderId: string;
}

export async function insertPaymentRecord(input: InsertPaymentRecordInput): Promise<PaymentRow> {
  const { rows } = await pool.query(
    `INSERT INTO payments (payment_number, booking_id, customer_id, worker_id, amount, method, provider, provider_order_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'sandbox', $7, 'pending')
     RETURNING *`,
    [
      input.paymentNumber,
      input.bookingId,
      input.customerId,
      input.workerId,
      input.amount,
      input.method,
      input.providerOrderId
    ]
  );
  return mapPaymentRow(rows[0]);
}

export async function getPaymentByBookingId(bookingId: string): Promise<PaymentDetails | null> {
  const { rows } = await pool.query(`${PAYMENT_SELECT} WHERE p.booking_id = $1`, [bookingId]);
  return rows[0] ? (mapPaymentRow(rows[0]) as PaymentDetails) : null;
}

export async function getPaymentById(id: string): Promise<PaymentDetails | null> {
  const { rows } = await pool.query(`${PAYMENT_SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ? (mapPaymentRow(rows[0]) as PaymentDetails) : null;
}

export async function resetPaymentForRetry(id: string, method: PaymentMethod): Promise<PaymentRow | null> {
  const { rows } = await pool.query(
    `UPDATE payments
     SET status = 'pending', method = $2, provider_order_id = $3, transaction_id = NULL, paid_at = NULL, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, method, `SANDBOX-${crypto.randomUUID()}`]
  );
  return rows[0] ? mapPaymentRow(rows[0]) : null;
}

export async function failPayment(id: string): Promise<PaymentRow | null> {
  const { rows } = await pool.query(
    `UPDATE payments SET status = 'failed', updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ? mapPaymentRow(rows[0]) : null;
}

export interface ComposeInvoiceInfo {
  payment: PaymentRow;
  booking: {
    id: string;
    customerId: string;
    customerName: string;
    workerId: string | null;
    workerName: string | null;
    cooperativeId: string | null;
    serviceName: string;
    subTotal: number;
    emergencySurcharge: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };
}

export async function completePaymentAndIssueInvoice(info: ComposeInvoiceInfo): Promise<{
  payment: PaymentRow;
  invoice: InvoiceRow;
}> {
  return withTransaction(async (client) => {
    const txnId = `SB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { rows: paymentRows } = await client.query(
      `UPDATE payments
       SET status = 'completed', transaction_id = $2, paid_at = now(), updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [info.payment.id, txnId]
    );
    if (!paymentRows[0]) {
      throw new Error("PAYMENT_STATE_CHANGED");
    }

    const payment = mapPaymentRow(paymentRows[0]);
    const dueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { rows: invoiceRows } = await client.query(
      `INSERT INTO invoices (
         invoice_number, payment_id, booking_id, customer_id, worker_id, cooperative_id,
         service_name, customer_name, worker_name, subtotal, emergency_surcharge, tax_rate, tax_amount,
         total, currency, status, paid_at, due_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'INR', 'paid', now(), $15)
       RETURNING *`,
      [
        generateInvoiceNumber(),
        payment.id,
        info.booking.id,
        info.booking.customerId,
        info.booking.workerId,
        info.booking.cooperativeId,
        info.booking.serviceName,
        info.booking.customerName,
        info.booking.workerName,
        info.booking.subTotal,
        info.booking.emergencySurcharge,
        info.booking.taxRate,
        info.booking.taxAmount,
        info.booking.total,
        dueDate
      ]
    );
    return { payment, invoice: mapInvoiceRow(invoiceRows[0]) };
  });
}

export interface ListPaymentsFilter {
  customerId?: string;
  workerId?: string;
  cooperativeIds?: string[] | null;
  status?: PaymentStatus;
  limit: number;
  offset: number;
}

export async function listPayments(filter: ListPaymentsFilter): Promise<PaymentDetails[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.customerId) {
    args.push(filter.customerId);
    where.push(`p.customer_id = $${args.length}`);
  }
  if (filter.workerId) {
    args.push(filter.workerId);
    where.push(`p.worker_id = $${args.length}`);
  }
  if (filter.cooperativeIds) {
    if (filter.cooperativeIds.length === 0) return [];
    args.push(filter.cooperativeIds);
    where.push(`b.cooperative_id = ANY($${args.length}::uuid[])`);
  }
  if (filter.status) {
    args.push(filter.status);
    where.push(`p.status = $${args.length}`);
  }
  args.push(filter.limit, filter.offset);
  const { rows } = await pool.query(
    `${PAYMENT_SELECT}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY p.created_at DESC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows.map((r) => mapPaymentRow(r) as PaymentDetails);
}

export async function getInvoiceById(id: string): Promise<InvoiceRow | null> {
  const { rows } = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [id]);
  return rows[0] ? mapInvoiceRow(rows[0]) : null;
}

export interface ListInvoicesFilter {
  customerId?: string;
  workerId?: string;
  cooperativeIds?: string[] | null;
  status?: InvoiceRow["status"];
  limit: number;
  offset: number;
}

export async function listInvoices(filter: ListInvoicesFilter): Promise<InvoiceRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.customerId) {
    args.push(filter.customerId);
    where.push(`i.customer_id = $${args.length}`);
  }
  if (filter.workerId) {
    args.push(filter.workerId);
    where.push(`i.worker_id = $${args.length}`);
  }
  if (filter.cooperativeIds) {
    if (filter.cooperativeIds.length === 0) return [];
    args.push(filter.cooperativeIds);
    where.push(`i.cooperative_id = ANY($${args.length}::uuid[])`);
  }
  if (filter.status) {
    args.push(filter.status);
    where.push(`i.status = $${args.length}`);
  }
  args.push(filter.limit, filter.offset);
  const { rows } = await pool.query(
    `SELECT i.* FROM invoices i
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY i.created_at DESC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows.map((r) => mapInvoiceRow(r));
}

export async function logPaymentEvent(
  paymentId: string | null,
  actorUserId: string,
  event: string,
  detail?: unknown
): Promise<void> {
  await pool.query(
    `INSERT INTO payment_logs (payment_id, actor_user_id, event, detail) VALUES ($1, $2, $3, $4)`,
    [paymentId, actorUserId, event, detail != null ? JSON.stringify(detail) : null]
  );
}

export function generatePaymentNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PAY-${ymd}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${ymd}-${rand}`;
}