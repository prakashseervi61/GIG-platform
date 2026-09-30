import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Analytics, Kpis } from "../lib/types";
import { Card, DataTable, ErrorBox, Skeleton, StatCard, Td, Th } from "../components/ui";
import { AdminHeader, Shell, usePageTitle } from "../components/shell";
import { inr } from "../lib/format";
import { useAuth } from "../useAuth";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/admin/dashboard"), api.get("/admin/analytics")])
      .then(([k, a]) => { setKpis(k as Kpis); setAnalytics(a as Analytics); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) return <Shell><AdminHeader title="Dashboard" /><ErrorBox error={error} /></Shell>;
  if (!kpis || !analytics) return (
    <Shell>
      <AdminHeader title="Dashboard" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </Shell>
  );

  const dayMax = Math.max(...analytics.bookingsByDay.map((d) => d.count), 1);
  const revMax = Math.max(...analytics.revenueByDay.map((d) => d.amount), 1);
  const statusTotal = analytics.bookingsByStatus.reduce((n, x) => n + x.count, 0) || 1;

  const statusColors: Record<string, string> = {
    completed: "#10b981", in_progress: "#8b5cf6", accepted: "#6366f1",
    assigned: "#3b82f6", requested: "#f59e0b", cancelled: "#ef4444", rejected: "#ef4444",
  };

  return (
    <Shell>
      <AdminHeader
        title={`Operations — ${user?.name ?? "Admin"}`}
        subtitle="Coimbatore + Chennai cooperatives · live data"
      />

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total bookings"       value={kpis.totalBookings}                        icon="🗂️" tone="blue" />
        <StatCard label="Active now"           value={kpis.activeBookings}                       icon="⚙️" tone="amber" />
        <StatCard label="Completed"            value={kpis.completedBookings}                    icon="✓"  tone="green" />
        <StatCard label="Emergency"            value={kpis.emergencyBookings}                    icon="⚡" tone="red" />
        <StatCard label="Transaction value"    value={inr(kpis.transactionValue)}                icon="₹"  tone="green" />
        <StatCard label="Total workers"        value={kpis.totalWorkers}                         icon="🧰" tone="slate" />
        <StatCard label="Verified workers"     value={kpis.verifiedWorkers}                      icon="🛡️" tone="green" />
        <StatCard label="Pending verification" value={kpis.pendingVerifications}                 icon="⏳" tone="amber" />
        <StatCard label="Customers"            value={kpis.totalCustomers}                       icon="👥" tone="blue" />
        <StatCard label="Avg rating"           value={`★ ${Number(kpis.avgRating).toFixed(2)}`} icon="⭐" tone="amber" />
      </div>

      {/* Charts row */}
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* Bookings + Revenue bar charts */}
        <Card className="p-5 lg:col-span-3">
          <p className="mb-1 text-[13px] font-semibold text-slate-700">Bookings · last 14 days</p>
          <div className="flex h-36 items-end gap-1">
            {analytics.bookingsByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-400">{d.count || ""}</span>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${(d.count / dayMax) * 100}%`,
                    background: "linear-gradient(to top,#5b5bf6,#a78bfa)",
                    minHeight: d.count ? "4px" : "0",
                  }}
                />
                <span className="text-[9px] text-slate-400">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>

          <p className="mb-1 mt-5 text-[13px] font-semibold text-slate-700">Revenue · last 14 days (₹)</p>
          <div className="flex h-28 items-end gap-1">
            {analytics.revenueByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(2, (d.amount / revMax) * 100)}%`,
                    background: "linear-gradient(to top,#10b981,#34d399)",
                  }}
                />
                <span className="text-[9px] text-slate-400">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Status breakdown + top workers */}
        <Card className="p-5 lg:col-span-2">
          <p className="mb-3 text-[13px] font-semibold text-slate-700">By status</p>
          <div className="space-y-2">
            {analytics.bookingsByStatus.map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium capitalize text-slate-600">{s.status.replace("_", " ")}</span>
                  <span className="text-slate-400">{s.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(s.count / statusTotal) * 100}%`,
                      background: statusColors[s.status] ?? "#94a3b8",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mb-2 mt-5 text-[13px] font-semibold text-slate-700">Top workers</p>
          {analytics.topWorkers.length === 0 ? (
            <p className="text-xs text-slate-400">No completed work yet.</p>
          ) : (
            <div className="space-y-1.5">
              {analytics.topWorkers.map((w, i) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>
                    <span className="text-[13px] font-medium text-slate-700">{w.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">★{Number(w.rating).toFixed(1)} · {w.completed} · {inr(w.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Service + Category tables */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 text-[13px] font-semibold text-slate-700">By service</p>
          <DataTable>
            <thead><tr><Th>Service</Th><Th>Bookings</Th><Th>Revenue</Th></tr></thead>
            <tbody>
              {analytics.bookingsByService.map((s) => (
                <tr key={s.service} className="border-t border-slate-50">
                  <Td>
                    <span className="font-medium">{s.service}</span>
                    <span className="ml-1.5 text-[11px] text-slate-400">{s.category}</span>
                  </Td>
                  <Td>{s.bookings}</Td>
                  <Td>{inr(s.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-[13px] font-semibold text-slate-700">By category</p>
          <DataTable>
            <thead><tr><Th>Category</Th><Th>Bookings</Th><Th>Revenue</Th></tr></thead>
            <tbody>
              {analytics.bookingsByCategory.map((c) => (
                <tr key={c.category} className="border-t border-slate-50">
                  <Td className="font-medium">{c.category}</Td>
                  <Td>{c.bookings}</Td>
                  <Td>{inr(c.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      </div>
    </Shell>
  );
}
