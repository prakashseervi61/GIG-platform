import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Earnings } from "../lib/types";
import { Card, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { Shell } from "../components/shell";
import { fmtDateTime, inr } from "../lib/format";

export default function EarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/workers/me/earnings").then((d) => setData(d as Earnings)).catch((e) => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><Skeleton className="h-40" /></Shell>;
  if (!data) return <Shell>{error ? <ErrorBox error={error} /> : <EmptyState title="No data" />}</Shell>;

  const max = data.monthly.reduce((m, x) => Math.max(m, x.amount), 0) || 1;

  return (
    <Shell>
      <h1 className="mb-4 text-xl font-extrabold text-slate-900">Earnings</h1>
      <Card className="p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total earned</div>
        <div className="mt-1 text-4xl font-extrabold text-brand-700">{inr(data.totalEarned)}</div>
        <div className="mt-1 text-sm text-slate-500">{data.paidBookings} paid job{data.paidBookings === 1 ? "" : "s"}</div>
      </Card>

      {data.monthly.length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="mb-3 text-sm font-bold text-slate-900">Last 12 months</h2>
          <div className="flex h-32 items-end gap-1.5">
            {data.monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-brand-200" style={{ height: `${Math.max(4, (m.amount / max) * 100)}%` }} title={inr(m.amount)} />
                <span className="text-[9px] text-slate-400">{m.month.slice(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.recentTransactions.length === 0 ? (
        <div className="mt-4"><EmptyState icon="🧾" title="No payouts yet" message="Completed payments appear here once the customer pays." /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.recentTransactions.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-bold text-slate-900">{inr(p.amount)}</div>
                <div className="text-xs text-slate-500">{p.paidAt ? fmtDateTime(p.paidAt) : "—"} {p.method ? `· ${p.method}` : ""}</div>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{p.status ?? "completed"}</span>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}