import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../lib/api";
import type { Notif } from "../lib/types";
import { Badge, Button, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime } from "../lib/format";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    return api.get("/notifications", { limit: 50 }).then((d) => setItems(d.notifications as Notif[]));
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false));
  }, []);

  async function markAll() {
    await api.patch("/notifications/read-all");
    setItems((xs) => xs.map((x) => ({ ...x, isRead: true })));
    // tell the shell the unread count changed, so the bell dot clears without
    // needing a navigation to trigger a refetch
    window.dispatchEvent(new Event("notifications:read"));
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">Notifications</h1>
        {unread > 0 && (
          <Button size="sm" tone="secondary" onClick={markAll}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={32} className="text-navy-400" />} title="No notifications yet" message="You'll be notified as your bookings progress." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${n.isRead ? "border-slate-200" : "border-brand-200 bg-brand-50/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-navy text-sm">{n.title}</div>
                {!n.isRead && <Badge tone="green">new</Badge>}
              </div>
              {n.body && <p className="mt-1 text-sm text-navy-600">{n.body}</p>}
              <div className="mt-1 text-[11px] text-navy-400">{fmtDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
