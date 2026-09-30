import type { AuthUser } from "../types";
import { ApiError } from "../utils/ApiError";
import { getCooperativesManagedByAdmin } from "../models/worker.model";
import {
  countAvailableWorkersForCategory,
  getZonesInScope,
  loadDailySeries,
  logValidationRun,
  type DailySeriesRow
} from "../models/forecast.model";
import type { ForecastQueryInput, WorkforceQueryInput } from "../schemas/forecast.schema";

export const FORECAST_MODEL = "seasonal-naive-weekday";

const HISTORY_DAYS = 120;
const VALIDATION_DAYS = 14;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekdayOf(iso: string): number {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface HistoryPoint {
  date: string;
  requests: number;
  emergency: number;
}

interface Scope {
  coopIds: string[] | null;
  zones: string[];
}

async function resolveScope(user: AuthUser): Promise<Scope> {
  if (user.role === "coop_admin") {
    const coops = await getCooperativesManagedByAdmin(user.sub);
    return { coopIds: coops.map((c) => c.id), zones: coops.map((c) => c.name) };
  }
  const zones = await getZonesInScope(null);
  zones.push("UNAFFILIATED");
  return { coopIds: null, zones };
}

function pinZone(scope: Scope, zone?: string): string[] {
  if (!zone) return scope.zones;
  if (!scope.zones.includes(zone)) {
    throw ApiError.badRequest("UNKNOWN_ZONE", `Zone "${zone}" is not within your scope`);
  }
  return [zone];
}

export interface ForecastPoint {
  date: string;
  zone: string;
  category: string;
  expectedRequests: number;
  emergencyExpected: number;
  label: "High" | "Medium" | "Low" | "Insufficient data";
  confidence: number;
  historicalMean: number;
}

function fitForecast(history: HistoryPoint[], target: string, zone: string, category: string): ForecastPoint | null {
  const wday = weekdayOf(target);
  // exclude the target itself: once a date has ingested bookings it would
  // otherwise feed its own observation back into the baseline predicting it
  const weekdaySamples = history.filter((p) => weekdayOf(p.date) === wday && p.date < target).slice(-12).map((p) => p.requests);
  const overall = history.map((p) => p.requests);
  const overallMean = mean(overall);
  if (overall.length === 0 || overallMean <= 0) {
    return {
      date: target,
      zone,
      category,
      expectedRequests: 0,
      emergencyExpected: 0,
      label: "Insufficient data",
      confidence: 0.05,
      historicalMean: 0
    };
  }

  const recentCut = addDaysIso(target, -28);
  const priorCut = addDaysIso(target, -56);
  const recent4 = history.filter((p) => p.date >= recentCut && p.date < target).map((p) => p.requests);
  const prior4 = history.filter((p) => p.date >= priorCut && p.date < recentCut).map((p) => p.requests);
  const recentMean = mean(recent4);
  const priorMean = mean(prior4);
  const trend = recentMean > 0 && priorMean > 0 ? clamp(recentMean / priorMean, 0.5, 2) : 1;

  const weekdayMean = mean(weekdaySamples);
  const base = weekdaySamples.length > 0 ? 0.6 * weekdayMean + 0.4 * overallMean : overallMean;
  const shareOverall = mean(history.map((p) => p.requests)) > 0 ? mean(history.map((p) => p.emergency)) / mean(history.map((p) => p.requests)) : 0;

  // Bookings already ingested for the target date are real observed demand, so
  // they are added on top of the model baseline rather than hidden inside it.
  // Without this the forecast ignores everything the live pipeline recorded.
  const observed = history.find((p) => p.date === target);
  const observedRequests = observed?.requests ?? 0;
  const observedEmergency = observed?.emergency ?? 0;
  const baseline = Math.round(base * trend);

  const expected = baseline + observedRequests;

  // The emergency figure is the day's modelled baseline plus the emergencies
  // already booked. It is deliberately not a share of `expected`, so that adding
  // a normal booking cannot move it, while an emergency booking always shows up
  // even when the share-based estimate would have rounded it away.
  const emergencyExpected = Math.round(baseline * clamp(shareOverall, 0, 1)) + observedEmergency;

  const label = expected >= 1.5 * overallMean ? "High" : expected >= 0.75 * overallMean ? "Medium" : "Low";
  const variance = mean(weekdaySamples.map((x) => x * x)) - weekdayMean * weekdayMean;
  const variability = weekdayMean > 0 ? Math.sqrt(Math.max(0, variance)) / weekdayMean : 3;
  const confidence = round2(clamp(0.1 + 0.06 * Math.sqrt(weekdaySamples.length) - 0.25 * Math.min(variability, 3), 0.05, 0.95));

  return {
    date: target,
    zone,
    category,
    expectedRequests: expected,
    emergencyExpected,
    label,
    confidence,
    historicalMean: round2(overallMean)
  };
}

function indexSeries(rows: DailySeriesRow[]): Map<string, HistoryPoint[]> {
  const map = new Map<string, HistoryPoint[]>();
  for (const row of rows) {
    const key = `${row.zone}|${row.category}`;
    const list = map.get(key) ?? [];
    list.push({ date: row.date, requests: row.requests, emergency: row.emergency });
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return map;
}

export async function generateForecast(user: AuthUser, query: ForecastQueryInput) {
  const scope = await resolveScope(user);
  const zones = pinZone(scope, query.zone);
  const end = query.date ?? todayIso();
  const start = addDaysIso(end, -(query.days - 1));
  const rows = await loadDailySeries({
    zones: scope.coopIds ? scope.zones : null,
    category: query.category,
    startDate: addDaysIso(end, -HISTORY_DAYS),
    endDate: end
  });
  const series = indexSeries(rows);

  const forecast: ForecastPoint[] = [];
  for (const zone of zones) {
    const categories = query.category ? [query.category] : [...new Set(rows.filter((r) => r.zone === zone).map((r) => r.category))];
    for (const category of categories) {
      const history = series.get(`${zone}|${category}`) ?? [];
      for (let d = 0; d < query.days; d++) {
        const target = addDaysIso(start, d);
        const point = fitForecast(history, target, zone, category);
        if (point) forecast.push(point);
      }
    }
  }
  forecast.sort((a, b) => (a.date === b.date ? a.zone.localeCompare(b.zone) : a.date < b.date ? -1 : 1));
  return { model: FORECAST_MODEL, generatedAt: todayIso(), period: { start, end }, zones, forecast };
}

export interface WorkforcePoint extends ForecastPoint {
  availableWorkers: number;
  recommendedWorkers: number;
  gap: number;
  recommendation: string;
}

export async function generateWorkforce(user: AuthUser, query: WorkforceQueryInput) {
  const scope = await resolveScope(user);
  const zones = pinZone(scope, query.zone);
  const end = query.date ?? todayIso();
  const start = addDaysIso(end, -(query.days - 1));
  const rows = await loadDailySeries({
    zones: scope.coopIds ? scope.zones : null,
    category: query.category,
    startDate: addDaysIso(end, -HISTORY_DAYS),
    endDate: end
  });
  const series = indexSeries(rows);

  const workforce: WorkforcePoint[] = [];
  for (const zone of zones) {
    const categories = query.category ? [query.category] : [...new Set(rows.filter((r) => r.zone === zone).map((r) => r.category))];
    for (const category of categories) {
      const history = series.get(`${zone}|${category}`) ?? [];
      for (let d = 0; d < query.days; d++) {
        const target = addDaysIso(start, d);
        const point = fitForecast(history, target, zone, category);
        if (!point) continue;
        const availableWorkers = await countAvailableWorkersForCategory({
          coopIds: scope.coopIds,
          zoneName: scope.coopIds ? undefined : zone,
          category
        });
        const recommendedWorkers = Math.ceil(point.expectedRequests / query.capacityPerWorker);
        const gap = recommendedWorkers - availableWorkers;
        workforce.push({
          ...point,
          availableWorkers,
          recommendedWorkers,
          gap,
          recommendation:
            gap > 0
              ? `Schedule ${gap} additional ${category} workers in ${zone} on ${target} to close the demand gap`
              : gap === 0
                ? `Coverage meets predicted demand in ${zone} on ${target}`
                : `Surplus of ${-gap} ${category} workers in ${zone} on ${target}`
        });
      }
    }
  }
  workforce.sort((a, b) => (a.date === b.date ? a.zone.localeCompare(b.zone) : a.date < b.date ? -1 : 1));
  return {
    model: FORECAST_MODEL,
    capacityPerWorker: query.capacityPerWorker,
    generatedAt: todayIso(),
    period: { start, end },
    zones,
    workforce
  };
}

export async function evaluateValidation(user: AuthUser) {
  const scope = await resolveScope(user);
  const end = todayIso();
  const start = addDaysIso(end, -(VALIDATION_DAYS - 1));
  const rows = await loadDailySeries({
    zones: scope.coopIds ? scope.zones : null,
    startDate: addDaysIso(end, -HISTORY_DAYS),
    endDate: end
  });

  const byCategory = new Map<string, HistoryPoint[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category);
    if (list) {
      list.push({ date: row.date, requests: row.requests, emergency: row.emergency });
    } else {
      byCategory.set(row.category, [{ date: row.date, requests: row.requests, emergency: row.emergency }]);
    }
  }
  for (const list of byCategory.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));

  const evaluate = (historyAll: HistoryPoint[], category: string) => {
    const errors: number[] = [];
    const pctErrors: number[] = [];
    const biases: number[] = [];
    for (let d = 0; d < VALIDATION_DAYS; d++) {
      const target = addDaysIso(start, d);
      const actual = historyAll.find((p) => p.date === target)?.requests ?? 0;
      const past = historyAll.filter((p) => p.date < target);
      const forecast = fitForecast(past, target, "validation", category);
      const expected = forecast?.expectedRequests ?? 0;
      errors.push(Math.abs(expected - actual));
      pctErrors.push(actual > 0 ? Math.abs(expected - actual) / actual : 0);
      biases.push(expected - actual);
    }
    return {
      days: VALIDATION_DAYS,
      mae: round2(mean(errors)),
      mape: round2(mean(pctErrors) * 100),
      bias: round2(mean(biases))
    };
  };

  const perCategory: Record<string, ReturnType<typeof evaluate>> = {};
  for (const [category, list] of byCategory) perCategory[category] = evaluate(list, category);

  const allStats = Object.values(perCategory);
  const overall =
    allStats.length === 0
      ? { days: VALIDATION_DAYS, mae: 0, mape: 0, bias: 0 }
      : {
          days: VALIDATION_DAYS,
          mae: round2(mean(allStats.map((s) => s.mae))),
          mape: round2(mean(allStats.map((s) => s.mape))),
          bias: round2(mean(allStats.map((s) => s.bias)))
        };

  await logValidationRun({
    actorId: user.sub,
    zone: scope.coopIds ? "coop-scoped" : "federation",
    summary: { model: FORECAST_MODEL, evaluatedPeriod: { start, end }, categories: [...byCategory.keys()] },
    metrics: { overall, perCategory }
  });

  return { model: FORECAST_MODEL, evaluatedPeriod: { start, end }, overall, perCategory };
}