import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { api } from "../lib/api";
import type { Notif } from "../lib/types";
import { Button, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime } from "../lib/format";

export default function Emergency() {
  const [loc, setLoc] = useState<{ label: string }>({ label: "Coimbatore, Tamil Nadu" });
  const [locating, setLocating] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState("");

  useEffect(() => {
    api
      .get("/notifications", { limit: 20, type: "emergency" })
      .then((d) => setNotifications((d.notifications as Notif[]) || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function detectLocation() {
    setLocating(true);
    try {
      const l = await fetch(`http://localhost:4000/api/location/me`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
      if (l?.location?.label) setLoc(l.location);
    } catch {
      setLoc({ label: "Coimbatore, Tamil Nadu" });
    } finally {
      setLocating(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Emergency Services</h1>
          <p className="text-xs text-navy-400">{loc?.label}</p>
        </div>
        <Zap size={20} className="text-red-500" />
      </div>

      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/60 p-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-red-600" fill="currentColor" />
          <span className="text-sm font-bold text-red-700">Need Help Urgently?</span>
        </div>
        <p className="mt-1 text-xs text-red-600/80">Get a nearby verified worker right now. Priority dispatch.</p>
      </div>

      <Button className="w-full" tone="danger" size="lg" loading={locating} onClick={detectLocation}>
        Request Emergency Service
      </Button>

      {error && <ErrorBox error={error} className="mt-4" />}

      <h2 className="mb-3 mt-6 text-base font-extrabold text-navy">Active emergency alerts</h2>
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : !notifications.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-navy-400 text-center">
          No active alerts.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="font-semibold text-navy text-sm">{n.title}</div>
              {n.body && <p className="mt-1 text-xs text-navy-600">{n.body}</p>}
              <div className="mt-2 text-[11px] text-navy-400">{fmtDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
