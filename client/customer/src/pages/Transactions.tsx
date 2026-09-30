import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Invoice, Payment } from "../lib/types";
import { Badge, Card, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime, inr } from "../lib/format";

export default function Transactions() {
  const [tab, setTab] = useState<"payments" | "invoices">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([api.get("/payments", { limit: 100 }), api.get("/invoices", { limit: 100 })]).then(([p, i]) => {
      if (p.status === "fulfilled") setPayments(p.value.payments as Payment[]);
      if (i.status === "fulfilled") setInvoices(i.value.invoices as Invoice[]);
      setLoading(false);
    }).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const tone = (s: string) => (s === "completed" ? "green" : s === "pending" ? "amber" : s === "failed" ? "red" : "slate");

  return (
    <>
      <h1 className="mb-4 text-xl font-extrabold text-slate-900">Payments</h1>
      <div className="mb-4 flex gap-1.5">
        {(["payments", "invoices"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
          >
            {t} ({t === "payments" ? payments.length : invoices.length})
          </button>
        ))}
      </div>

      {loading ? <Skeleton className="h-24" /> : error ? <ErrorBox error={error} /> : tab === "payments" ? (
        payments.length === 0 ? (
          <EmptyState icon="💳" title="No transactions yet" message="Payments appear here after a job is completed." />
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-bold text-slate-900">{inr(p.amount)}</div>
                  <div className="text-xs text-slate-500">{p.method.toUpperCase()} · {fmtDateTime(p.createdAt)}</div>
                  <div className="font-mono text-[11px] text-slate-400">{p.paymentNumber}</div>
                </div>
                <Badge tone={tone(p.status) as "green"}>{p.status}</Badge>
              </Card>
            ))}
          </div>
        )
      ) : invoices.length === 0 ? (
        <EmptyState icon="🧾" title="No invoices yet" message="Invoices are generated when a payment is completed." />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-bold text-slate-900">{inv.invoiceNumber}</div>
                <Badge tone={(inv.status === "paid" ? "green" : "slate") as "green"}>{inv.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-600">{inv.serviceName} · {inv.workerName ?? "—"}</div>
              {inv.cooperativeName && <div className="text-xs text-slate-400">{inv.cooperativeName}</div>}
              <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm">
                <span className="text-slate-500">{fmtDateTime(inv.issuedAt)}</span>
                <span className="font-extrabold text-slate-900">{inr(inv.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Anything off? <Link to="/bookings" className="font-semibold text-brand-700">View your bookings</Link>
      </p>
    </>
  );
}