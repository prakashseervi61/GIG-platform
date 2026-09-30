import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Booking, WorkerProfile } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { Shell } from "../components/shell";
import { fmtDateTime, inr } from "../lib/format";

const tabs = ["incoming", "active", "completed", "cancelled"] as const;
const STATUSES: Record<string, string[]> = {
  incoming: ["requested"],
  active: ["accepted", "in_progress"],
  completed: ["completed"],
  cancelled: ["cancelled", "rejected"]
};

export default function Jobs() {
  const [me, setMe] = useState<WorkerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]>("incoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [acting, setActing] = useState("");

  async function load(keepLoading = false) {
    if (!keepLoading) setLoading(true);
    try {
      const [m, b] = await Promise.all([api.get("/workers/me"), api.get("/bookings", { limit: 200 })]);
      setMe(m.profile as WorkerProfile);
      setBookings((b.bookings as Booking[]).sort((a, c) => (a.scheduledStart < c.scheduledStart ? -1 : 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const t = setInterval(() => void load(true), 8000);
    return () => clearInterval(t);
  }, []);

  async function toggleAvailability() {
    if (!me) return;
    setToggling(true);
    try {
      await api.patch(`/workers/${me.id}/availability`, { isAvailable: !me.isAvailable });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggling(false);
    }
  }

  async function act(id: string, status: string) {
    setActing(`${id}:${status}`);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setActing("");
    }
  }

  const rows = bookings.filter((b) => STATUSES[tab].includes(b.status));

  return (
    <Shell>
      {(me != null) && (
        <Card className="mb-4 flex items-center justify-between p-4">
          <div>
            <div className="font-extrabold text-slate-900">{me.name}</div>
            <div className="text-xs text-slate-500">★ {Number(me.rating).toFixed(1)} · {me.verificationStatus} · {inr(me.hourlyRate)}/hr</div>
          </div>
          <Button size="sm" tone={me.isAvailable ? "green" : "ghost"} loading={toggling} onClick={toggleAvailability}>
            {me.isAvailable ? "● Available" : "○ Offline"}
          </Button>
        </Card>
      )}

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <Skeleton className="h-24" /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <EmptyState icon="🗂️" title={`No ${tab} jobs`} message={tab === "incoming" ? "When a customer books you, the request appears here instantly." : "Nothing here yet."} />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-slate-900">{b.serviceName}</div>
                <Badge tone={b.priority === "emergency" ? "red" : "slate"}>{b.priority === "emergency" ? "⚡ urgent" : b.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-600">👤 {b.customerName}</div>
              <div className="text-xs text-slate-400">{fmtDateTime(b.scheduledStart)} · {b.address}</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900">{inr(b.price)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/jobs/${b.id}`}><Button size="sm" tone="secondary">Details</Button></Link>
                {b.status === "requested" && (
                  <>
                    <Button size="sm" loading={acting === `${b.id}:accepted`} onClick={() => act(b.id, "accepted")}>Accept</Button>
                    <Button size="sm" tone="danger" loading={acting === `${b.id}:rejected`} onClick={() => act(b.id, "rejected")}>Decline</Button>
                  </>
                )}
                {b.status === "accepted" && (
                  <Button size="sm" tone="amber" loading={acting === `${b.id}:in_progress`} onClick={() => act(b.id, "in_progress")}>Start work</Button>
                )}
                {b.status === "in_progress" && (
                  <Button size="sm" tone="green" loading={acting === `${b.id}:completed`} onClick={() => act(b.id, "completed")}>Mark complete</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}