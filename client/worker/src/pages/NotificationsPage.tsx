import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Notif } from "../lib/types";
import { Badge, Button, ErrorBox, Skeleton } from "../components/ui";
import { Shell } from "../components/shell";
import { fmtDateTime } from "../lib/format";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    return api.get("/notifications", { limit: 50 }).then((d) => setItems(d.notifications as Notif[]));
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load")).finally(() => setLoading(false)); }, []);

  async function markAll() {
    await api.patch("/notifications/read-all");
    setItems((xs) => xs.map((x) => ({ ...x, isRead: true })));
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Notifications</h1>
        {unread > 0 && <Button size="sm" tone="secondary" onClick={markAll}>Mark all read</Button>}
      </div>
      {loading ? <Skeleton className="h-20" /> : error ? <ErrorBox error={error} /> : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${n.isRead ? "border-slate-200" : "border-brand-200 bg-brand-50/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-800">{n.title}</div>
                {!n.isRead && <Badge tone="green">new</Badge>}
              </div>
              {n.body && <p className="mt-1 text-sm text-slate-500">{n.body}</p>}
              <div className="mt-1 text-[11px] text-slate-400">{fmtDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}