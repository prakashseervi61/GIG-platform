import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreditCard, Smartphone, Building2, Wallet, Lock } from "lucide-react";
import { api } from "../lib/api";
import type { Booking, Payment } from "../lib/types";
import { Button, Card, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime, inr } from "../lib/format";

const methods = [
  { value: "upi", label: "UPI", Icon: Smartphone },
  { value: "card", label: "Card", Icon: CreditCard },
  { value: "netbanking", label: "Net Banking", Icon: Building2 },
  { value: "wallet", label: "Wallet", Icon: Wallet },
  { value: "cash", label: "Cash after Service", Icon: Wallet },
];

export default function Payment() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${id}`),
      api.get("/payments", { limit: 100 }),
    ]).then(([b, p]) => {
      setBooking(b.booking as Booking);
      setPayments((p.payments as Payment[]).filter((x) => x.bookingId === id));
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <><Skeleton className="h-40" /></>
    );
  }
  if (error || !booking) {
    return <><ErrorBox error={error} /></>;
  }

  const completed = payments.find((p) => p.status === "completed");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await api.post("/payments/create", { bookingId: id, method });
      await api.post("/payments/verify", { paymentId: `${id}-${method}` });
      nav(`/bookings/${id}/confirm`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold text-navy">Payment</h1>
        <span className="text-xs font-medium text-navy-400">Secure</span>
      </div>

      <Card className="mb-4 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Worker</span>
          <span className="font-semibold text-navy">{booking.workerName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Service</span>
          <span className="font-semibold text-navy">{booking.serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Date</span>
          <span className="font-semibold text-navy">{fmtDateTime(booking.scheduledStart)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Location</span>
          <span className="font-semibold text-navy text-right max-w-[60%]">{booking.address}</span>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <h2 className="mb-3 text-base font-extrabold text-navy">Payment method</h2>
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                method === m.value ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <m.Icon size={20} className={method === m.value ? "text-brand-700" : "text-navy-400"} />
              <span className="flex-1 font-semibold text-navy">{m.label}</span>
              <span className={`h-4 w-4 rounded-full border ${method === m.value ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}>
                {method === m.value && <span className="block h-2 w-2 rounded-full bg-white m-auto mt-1" />}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <h2 className="mb-2 text-base font-extrabold text-navy">Order summary</h2>
        <div className="flex justify-between text-sm text-navy-600"><span>Subtotal</span><span>{inr(booking.price)}</span></div>
        <div className="flex justify-between text-sm text-navy-600"><span>Service fee</span><span>₹0</span></div>
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-lg font-extrabold text-navy">
          <span>Total</span><span>{inr(booking.price)}</span>
        </div>
      </Card>

      {completed && (
        <Card className="mb-4 p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-800">✓ Payment completed</p>
        </Card>
      )}

      <Button className="w-full" size="lg" loading={busy} onClick={pay} disabled={!!completed}>
        Pay {inr(booking.price)}
      </Button>

      <p className="mt-4 flex items-center justify-center gap-1 text-xs text-navy-400">
        <Lock size={10} /> Your payment is securely processed.
      </p>

      {error && <ErrorBox error={error} className="mt-4" />}
    </>
  );
}
