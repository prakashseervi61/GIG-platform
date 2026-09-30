import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ForecastResponse, ValidationRow, WorkforceResponse } from "../lib/types";
import { Badge, Button, Card, DataTable, ErrorBox, FilterPills, Select, Skeleton, StatCard, Td, Th } from "../components/ui";
import { AdminHeader, Shell, usePageTitle } from "../components/shell";
import { fmtDateTime } from "../lib/format";
import { useAuth } from "../useAuth";

const DAYS = ["7", "14", "30", "60"] as const;
const TABS = ["forecast", "workforce", "validation"] as const;

export default function Forecast() {
  usePageTitle("Forecast");
  const { user } = useAuth();
  const [tab, setTab] = useState<"forecast" | "workforce" | "validation">("forecast");
  const [days, setDays] = useState("14");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [workforce, setWorkforce] = useState<WorkforceResponse | null>(null);
  const [validation, setValidation] = useState<ValidationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, w, v] = await Promise.all([
        api.get(`/forecast?days=${days}&insights=true`).catch(() => null),
        api.get("/forecast/workforce").catch(() => null),
        api.get("/forecast/validation").catch(() => null),
      ]);
      setForecast(f as ForecastResponse | null);
      setWorkforce(w as WorkforceResponse | null);
      setValidation(v as ValidationRow | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forecast");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  async function rebuild() {
    setNotice("");
    try {
      const r = await api.post("/forecast/rebuild", {});
      setNotice(`Rebuilt from booking history — ${typeof r?.status === "string" ? r.status : "rows regenerated"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rebuild failed");
    }
  }

  const rows = forecast?.forecast ?? [];
  const wfh = workforce?.workforce ?? [];
  const cats = validation?.perCategory ? Object.keys(validation.perCategory) : [];
  const totalDays = new Set(rows.map((r) => r.date)).size;

  return (
    <Shell>
      <AdminHeader title="Demand Forecast" subtitle="Seasonal-naive-weekday model trained on booking history." />

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterPills options={TABS} value={tab} onChange={(v) => setTab(v as typeof tab)} />
        {tab === "forecast" && (
          <Select className="w-28 py-1.5 text-xs" value={days} onChange={(e) => setDays(e.target.value)}>
            {DAYS.map((d) => <option key={d} value={d}>{d} days</option>)}
          </Select>
        )}
        {user?.role === "federation_admin" && (
          <Button size="sm" tone="ghost" onClick={() => void rebuild()}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.75.75 0 011.357-.636A6.5 6.5 0 118 1.5v1.25a.75.75 0 01-1.5 0V1a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H8z" clipRule="evenodd" /></svg>
            Rebuild dataset
          </Button>
        )}
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          <span>✓</span> {notice}
        </div>
      )}
      {error && <ErrorBox error={error} className="mb-4" />}

      {loading ? (
        <Skeleton className="h-48" />
      ) : tab === "forecast" ? (
        <div>
          {/* Meta cards */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Model</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{forecast?.model ?? "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Generated</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{forecast?.generatedAt ? fmtDateTime(forecast.generatedAt) : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Coverage · {totalDays} days</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {forecast?.period ? `${forecast.period.start.slice(0, 10)} → ${forecast.period.end.slice(0, 10)}` : "—"}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <DataTable>
              <thead>
                <tr><Th>Date</Th><Th>Zone</Th><Th>Category</Th><Th>Expected</Th><Th>Emergency</Th><Th>Label</Th><Th>Confidence</Th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No forecast rows yet. Rebuild the dataset to train on booking history.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={`${r.date}-${r.category}-${i}`} className="border-t border-slate-50">
                    <Td className="font-mono text-[12px]">{r.date.slice(0, 10)}</Td>
                    <Td className="text-slate-400">{r.zone}</Td>
                    <Td className="font-medium">{r.category}</Td>
                    <Td className="font-semibold">{r.expectedRequests}</Td>
                    <Td>{r.emergencyExpected > 0 ? <Badge tone="red">{r.emergencyExpected}</Badge> : <span className="text-slate-300">—</span>}</Td>
                    <Td><Badge tone={r.label === "High" ? "red" : r.label === "Medium" ? "amber" : "slate"}>{r.label}</Badge></Td>
                    <Td className="text-slate-400">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Card>
        </div>
      ) : tab === "workforce" ? (
        <Card className="p-5">
          {wfh.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No workforce rows yet — check back once forecast data is available.</p>
          ) : (
            <DataTable>
              <thead>
                <tr><Th>Date</Th><Th>Category</Th><Th>Available</Th><Th>Recommended</Th><Th>Gap</Th><Th>Insight</Th></tr>
              </thead>
              <tbody>
                {wfh.map((r, i) => (
                  <tr key={`${r.date}-${r.category}-${i}`} className="border-t border-slate-50">
                    <Td className="font-mono text-[12px]">{r.date.slice(0, 10)}</Td>
                    <Td className="font-medium">{r.category}</Td>
                    <Td>{r.availableWorkers}</Td>
                    <Td>{r.recommendedWorkers}</Td>
                    <Td>{r.gap > 0 ? <Badge tone="red">+{r.gap} needed</Badge> : <Badge tone="green">+{Math.abs(r.gap)} surplus</Badge>}</Td>
                    <Td className="max-w-xs text-[12px] text-slate-400">{r.recommendation}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      ) : (
        <div>
          {/* Validation KPIs */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="MAE"           value={validation?.overall?.mae  != null ? validation.overall.mae.toFixed(2)          : "—"} tone="blue" />
            <StatCard label="MAPE"          value={validation?.overall?.mape != null ? `${validation.overall.mape.toFixed(1)}%`   : "—"} tone="amber" />
            <StatCard label="Bias"          value={validation?.overall?.bias != null ? validation.overall.bias.toFixed(2)          : "—"} tone="slate" />
            <StatCard label="Days evaluated" value={validation?.overall?.days ?? "—"} tone="green" />
            <StatCard label="Model"         value={validation?.model ?? "—"} tone="violet" />
          </div>

          {cats.length > 0 && (
            <Card className="p-5">
              <DataTable>
                <thead><tr><Th>Category</Th><Th>MAE</Th><Th>MAPE</Th><Th>Bias</Th><Th>Days</Th></tr></thead>
                <tbody>
                  {cats.map((cat) => {
                    const m = validation!.perCategory[cat];
                    return (
                      <tr key={cat} className="border-t border-slate-50">
                        <Td className="font-semibold">{cat}</Td>
                        <Td>{m.mae.toFixed(2)}</Td>
                        <Td>{m.mape.toFixed(1)}%</Td>
                        <Td>{m.bias.toFixed(2)}</Td>
                        <Td>{m.days}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
              <p className="mt-3 text-[11px] text-slate-400">
                Evaluated {validation?.evaluatedPeriod?.start.slice(0, 10)} → {validation?.evaluatedPeriod?.end.slice(0, 10)} against actuals.
              </p>
            </Card>
          )}
        </div>
      )}
    </Shell>
  );
}
