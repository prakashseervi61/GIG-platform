import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Booking, Payment } from "../lib/types";
import { BackLink, Badge, Button, Card, ConfirmDialog, ErrorBox, Field, Select, Skeleton, StarRating, StatusBadge, StatusStepper } from "../components/ui";
import { fmtDateTime, inr } from "../lib/format";

const methods = ["upi", "card", "netbanking", "wallet"];

export default function BookingDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [method, setMethod] = useState("upi");
  const [sandboxOrder, setSandboxOrder] = useState<Payment | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);
  const [rated, setRated] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, p, inv] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get("/payments", { limit: 100 }),
        api.get("/invoices", { limit: 100 })
      ]);
      setBooking(b.booking as Booking);
      const myPayments = (p.payments as Payment[]).filter((x) => x.bookingId === id);
      setPayments(myPayments);
      if ((inv.invoices as { bookingId: string }[]).some((x) => x.bookingId === id)) setHasInvoice(true);
      setSandboxOrder(myPayments.find((x) => x.status === "pending") ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load booking");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!booking || ["completed", "cancelled", "rejected"].includes(booking.status)) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [booking, load]);

  async function doCancel() {
    setBusy("cancel");
    try {
      await api.patch(`/bookings/${id}/status`, { status: "cancelled", reason: "Cancelled by customer" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy("");
      setConfirmCancel(false);
    }
  }

  async function createPayment() {
    setBusy("create");
    setError("");
    try {
      const d = await api.post("/payments/create", { bookingId: id, method });
      setSandboxOrder(d.payment as Payment);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment creation failed");
    } finally {
      setBusy("");
    }
  }

  async function verifyPayment() {
    if (!sandboxOrder) return;
    setBusy("verify");
    setError("");
    try {
      const d = await api.post("/payments/verify", { paymentId: sandboxOrder.id });
      setHasInvoice(!!d.invoice);
      setSandboxOrder(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy("");
    }
  }

  async function submitRating() {
    setBusy("rate");
    setError("");
    setRatingMsg(null);
    try {
      await api.post("/ratings", { bookingId: id, rating, comment: comment || undefined });
      setRated(true);
      setRatingMsg("Thanks! Your rating is recorded.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_RATED") {
        setRated(true);
        setRatingMsg("You already rated this worker.");
      } else {
        setError(e instanceof Error ? e.message : "Rating failed");
      }
    } finally {
      setBusy("");
    }
  }

  if (!booking) {
    return (
      <>
        <BackLink to="/bookings" />
        {error ? <ErrorBox error={error} /> : <Skeleton className="h-40" />}
      </>
    );
  }

  const completedPayment = payments.find((p) => p.status === "completed");
  const showPayment = booking.status === "completed" && !completedPayment;
  const showRate = booking.status === "completed" && !rated && !ratingMsg;

  return (
    <>
      <BackLink to="/bookings" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold text-slate-900">{booking.serviceName}</h1>
        <StatusBadge status={booking.status} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
          <Badge tone={booking.priority === "emergency" ? "red" : "slate"}>{booking.priority === "emergency" ? "⚡ emergency" : "normal"}</Badge>
          <span className="font-mono text-xs text-slate-400">{booking.bookingNumber}</span>
        </div>
        <StatusStepper status={booking.status} />
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
          <Row k="Worker" v={booking.workerName ?? (booking.status === "requested" ? "Assigning best match…" : "Unassigned")} />
          <Row k="Category" v={booking.serviceCategory} />
          <Row k="When" v={fmtDateTime(booking.scheduledStart)} />
          <Row k="Where" v={booking.address} />
          {booking.notes && <Row k="Notes" v={booking.notes} />}
          {booking.cooperativeName && <Row k="Cooperative" v={booking.cooperativeName} />}
          <Row k="Total" v={<span className="font-extrabold text-slate-900">{inr(booking.price)}</span>} />
        </dl>
      </Card>

      {(["requested", "assigned", "accepted"].includes(booking.status)) && (
        <Card className="mt-4 p-4">
          <p className="text-sm text-slate-500">Waiting on {booking.workerName ? `${booking.workerName} to respond` : "worker matching"}… This page refreshes automatically.</p>
          <Button tone="danger" size="sm" className="mt-3" onClick={() => setConfirmCancel(true)}>Cancel booking</Button>
        </Card>
      )}

      {showPayment && (
        <Card className="mt-4 space-y-3 p-4">
          <h2 className="text-base font-bold text-slate-900">Pay {inr(booking.price)}</h2>
          {!sandboxOrder ? (
            <>
              <Field label="Payment method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {methods.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </Select>
              </Field>
              <Button className="w-full" loading={busy === "create"} onClick={createPayment}>Pay {inr(booking.price)}</Button>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Sandbox order created — <span className="font-mono text-xs">{sandboxOrder.paymentNumber}</span> ({sandboxOrder.status})
              </div>
              <Button className="w-full" tone="amber" loading={busy === "verify"} onClick={verifyPayment}>
                Simulate payment success (sandbox)
              </Button>
            </>
          )}
        </Card>
      )}

      {completedPayment && (
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">✓ Payment completed</div>
              <div className="text-xs text-slate-500">{completedPayment.method.toUpperCase()} · {fmtDateTime(completedPayment.paidAt ?? completedPayment.createdAt)}</div>
            </div>
            <Badge tone="green">{inr(completedPayment.amount)}</Badge>
          </div>
          <Button size="sm" tone="secondary" className="mt-3" onClick={() => nav("/invoices")}>View invoice {hasInvoice ? "✓" : ""}</Button>
        </Card>
      )}

      {showRate && (
        <Card className="mt-4 space-y-3 p-4">
          <h2 className="text-base font-bold text-slate-900">Rate {booking.workerName?.split(" ")[0] ?? "the worker"}</h2>
          <StarRating value={rating} onChange={setRating} size="text-2xl" />
          <Field label="Comment (optional)">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the service?"
            />
          </Field>
          <Button className="w-full" loading={busy === "rate"} onClick={submitRating}>Submit rating</Button>
        </Card>
      )}

      {ratingMsg && <Card className="mt-4 p-4 text-sm text-brand-700">⭐ {ratingMsg}</Card>}
      {error && <ErrorBox error={error} className="mt-4" />}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this booking?"
        message={`${booking?.serviceName ?? "This booking"} will be cancelled. This can't be undone.`}
        confirmLabel="Cancel booking"
        busy={busy === "cancel"}
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right text-slate-800">{v}</dd>
    </div>
  );
}