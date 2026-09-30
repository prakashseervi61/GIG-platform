import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Booking, BookingStatus } from "../lib/types";
import { Badge, Card, ErrorBox, FilterPills, Select, Skeleton } from "../components/ui";
import { AdminHeader, Shell, usePageTitle } from "../components/shell";
import { inr } from "../lib/format";

const FILTERS = ["all", "requested", "assigned", "accepted", "in_progress", "completed", "cancelled", "rejected"] as const;
const STATUSES: BookingStatus[] = ["requested", "assigned", "accepted", "in_progress", "completed"];

const statusDot: Record<string, string> = {
  completed: "#10b981", in_progress: "#8b5cf6", accepted: "#6366f1",
  assigned: "#3b82f6", requested: "#f59e0b", cancelled: "#ef4444", rejected: "#ef4444",
};

export default function Bookings() {
  usePageTitle("Bookings");
  const [rows, setRows] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get("/bookings", { limit: 200 });
      setRows((d.bookings as Booking[]).sort((a, b) => (a.scheduledStart < b.scheduledStart ? 1 : -1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(id: string, status: BookingStatus) {
    setPending((p) => ({ ...p, [id]: status }));
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setPending((p) => { const c = { ...p }; delete c[id]; return c; });
    }
  }

  const shown = filter === "all" ? rows : rows.filter((b) => b.status === filter);

  return (
    <Shell>
      <AdminHeader title="Bookings" subtitle="All bookings across cooperatives — force status for demo or drills." />

      {error && <ErrorBox error={error} className="mb-4" />}

      <div className="mb-4">
        <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {loading ? (
        <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : shown.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No bookings match this filter.</Card>
      ) : (
        <div className="space-y-2">
          {shown.slice(0, 100).map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              {/* Status dot + info */}
              <div className="flex items-center gap-3">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: statusDot[b.status] ?? "#94a3b8" }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-900">{b.serviceName}</span>
                    <span className="font-mono text-[11px] text-slate-400">#{b.bookingNumber}</span>
                    {b.priority === "emergency" && (
                      <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">⚡ EMERGENCY</span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-400">
                    {b.customerName} → {b.workerName ?? "unassigned"} · {b.scheduledStart.slice(0, 10)} {b.scheduledStart.slice(11, 16)} · {inr(b.price)}
                  </div>
                </div>
              </div>

              {/* Status badge + selector */}
              <div className="flex items-center gap-2">
                <Badge tone={b.status === "completed" ? "green" : b.status === "cancelled" || b.status === "rejected" ? "red" : b.status === "in_progress" ? "violet" : "slate"}>
                  {b.status.replace("_", " ")}
                </Badge>
                <Select
                  className="w-36 py-1.5 text-xs"
                  value={pending[b.id] ?? ""}
                  onChange={(e) => e.target.value && void changeStatus(b.id, e.target.value as BookingStatus)}
                >
                  <option value="">Set status…</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
