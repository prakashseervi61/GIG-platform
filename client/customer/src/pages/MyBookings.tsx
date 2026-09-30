import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";
import { EmptyState, ErrorBox, Skeleton, StatusBadge } from "../components/ui";
import { fmtDateTime, inr } from "../lib/format";

/**
 * Every tab maps to statuses that actually exist in the bookings CHECK
 * constraint. The old default tab was "upcoming", which is not a status, so
 * the page always opened on an empty list.
 */
const tabs = [
  { key: "requested", label: "Requested", statuses: ["requested"] },
  { key: "ongoing", label: "Ongoing", statuses: ["assigned", "accepted", "in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "closed", label: "Closed", statuses: ["cancelled", "rejected"] }
] as const satisfies ReadonlyArray<{ key: string; label: string; statuses: readonly string[] }>;

type TabKey = (typeof tabs)[number]["key"];

const OPEN_STATUSES = ["requested", "assigned", "accepted", "in_progress"];

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<TabKey>("requested");
  const [pickedTab, setPickedTab] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/bookings", { limit: 100 })
      .then((d) => setBookings(d.bookings as Booking[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const activeTab = tabs.find((t) => t.key === filter)!;
  const rows = bookings.filter((b) => (activeTab.statuses as readonly string[]).includes(b.status));

  const openCount = bookings.filter((b) => OPEN_STATUSES.includes(b.status)).length;

  // Land on the first tab that actually has something in it, so the page never
  // opens on an empty list. Respects a tab the user picked by hand.
  useEffect(() => {
    if (pickedTab || loading || bookings.length === 0) return;
    const firstWithRows = tabs.find((t) =>
      bookings.some((b) => (t.statuses as readonly string[]).includes(b.status))
    );
    if (firstWithRows) setFilter(firstWithRows.key);
  }, [bookings, loading, pickedTab]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-navy">My Bookings</h1>
          <p className="text-xs text-navy-400">{openCount} active</p>        </div>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setFilter(t.key);
              setPickedTab(true);
            }}
            aria-current={filter === t.key ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
              filter === t.key ? "bg-brand-600 text-white" : "bg-white text-navy-600 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📋"
          title={`No ${activeTab.label.toLowerCase()} bookings`}
          message="Book a service from the home page to get started."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <Link to={`/bookings/${b.id}`} key={b.id}>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-navy">{b.serviceName}</div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-navy-400">
                  <span>{b.workerName ?? "Assigning…"} · {fmtDateTime(b.scheduledStart)}</span>
                  <span className="font-semibold text-navy">{inr(b.price)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
