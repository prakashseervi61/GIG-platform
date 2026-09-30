import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AdminWorker } from "../lib/types";
import { Badge, Button, Card, ErrorBox, FilterPills, Input, Skeleton } from "../components/ui";
import { AdminHeader, Shell, usePageTitle } from "../components/shell";
import { inr } from "../lib/format";

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const avatarColors = ["#5b5bf6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];
function avatarColor(id: string) {
  return avatarColors[id.charCodeAt(0) % avatarColors.length];
}

export default function Workers() {
  usePageTitle("Workers");
  const [rows, setRows] = useState<AdminWorker[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (filter !== "all") q.set("status", filter);
      if (search.trim()) q.set("search", search.trim());
      const d = await api.get(`/admin/workers${q.toString() ? `?${q}` : ""}`);
      setRows(d.workers as AdminWorker[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { void load(); }, [load]);

  async function verify(workerId: string, status: string) {
    setActing(`${workerId}:${status}`);
    try {
      await api.patch(`/admin/workers/${workerId}/verify`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setActing("");
    }
  }

  async function verifyCert(workerId: string, certId: string, status: string) {
    setActing(`${workerId}cert:${certId}:${status}`);
    try {
      await api.patch(`/admin/workers/${workerId}/certifications/${certId}/verify`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Certification verification failed");
    } finally {
      setActing("");
    }
  }

  return (
    <Shell>
      <AdminHeader title="Workers" subtitle="Verify profiles and certifications before they earn customer trust." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
        <Input className="w-52" placeholder="Search worker…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <ErrorBox error={error} className="mb-4" />}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No workers found.</Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: avatarColor(w.id) }}
                  >
                    {initials(w.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{w.name}</div>
                    <div className="text-[12px] text-slate-400">
                      {w.cooperativeName ?? "Independent"} · {w.experienceYears ?? 0} yrs exp · {inr(w.hourlyRate)}/hr · ★{Number(w.rating).toFixed(1)} ({w.ratingCount})
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={w.verificationStatus === "approved" ? "green" : w.verificationStatus === "rejected" ? "red" : "amber"}>
                    {w.verificationStatus}{w.isAvailable ? " · online" : ""}
                  </Badge>
                  {w.verificationStatus === "pending" && (
                    <>
                      <Button size="sm" tone="green" loading={acting === `${w.id}:approved`} onClick={() => verify(w.id, "approved")}>Approve</Button>
                      <Button size="sm" tone="danger" loading={acting === `${w.id}:rejected`} onClick={() => verify(w.id, "rejected")}>Reject</Button>
                    </>
                  )}
                  <Button size="sm" tone="ghost" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                    {(w.certifications?.length ?? 0) > 0 ? `Certs (${w.certifications?.length})` : "Details"}
                    <span className="ml-0.5 text-[10px]">{expanded === w.id ? "▲" : "▼"}</span>
                  </Button>
                </div>
              </div>

              {/* Expanded certs */}
              {expanded === w.id && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  {(!w.certifications || w.certifications.length === 0) ? (
                    <p className="text-xs text-slate-400">No certifications on file.</p>
                  ) : (
                    <div className="space-y-2">
                      {w.certifications.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                          <div>
                            <span className="text-[13px] font-medium text-slate-700">{c.issuer}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-400">
                              {c.certificateNumber ?? ""}{c.issueDate ? " · " + c.issueDate.slice(0, 10) : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={c.verificationStatus === "approved" ? "green" : c.verificationStatus === "rejected" ? "red" : "amber"}>
                              {c.verificationStatus}
                            </Badge>
                            {c.verificationStatus === "pending" && (
                              <>
                                <Button size="sm" tone="green" loading={acting === `${w.id}cert:${c.id}:approved`} onClick={() => verifyCert(w.id, c.id, "approved")}>✓</Button>
                                <Button size="sm" tone="danger" loading={acting === `${w.id}cert:${c.id}:rejected`} onClick={() => verifyCert(w.id, c.id, "rejected")}>✕</Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
