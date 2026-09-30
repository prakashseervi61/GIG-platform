import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, ChevronRight, ArrowRight, MapPin, Star, ShieldCheck, Clock, RefreshCw, AlertTriangle, Zap
} from "lucide-react";
import { api } from "../lib/api";
import type { LocationResult, Service, WorkerResult } from "../lib/types";
import { Button, Card, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { WorkerCard } from "../components/WorkerCard";
import { COIMBATORE, getStoredLocation, locCoords, requestLocation, setStoredLocation } from "../lib/geo";
import { inr } from "../lib/format";
import { categoryIcon, categoryTint, serviceCategories } from "../lib/categories";


const railCategories = serviceCategories;

const trustPoints = [
  { Icon: ShieldCheck, label: "Background verified" },
  { Icon: Star, label: "Fair, fixed rates" },
  { Icon: Clock, label: "Same-day slots" },
];

export default function Home() {
  const nav = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<WorkerResult[]>([]);
  const [loc, setLoc] = useState<LocationResult | null>(getStoredLocation);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get("/services", { sort: "popular" })
      .then((d) => {
        if (alive) setServices(d.services as Service[]);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retry]);

  useEffect(() => {
    const { lat, lng } = locCoords(getStoredLocation());
    api
      .get("/search/workers", { lat, lng, radiusKm: 10, limit: 5, sort: "rating" })
      .then((d) => setWorkers((d.workers as WorkerResult[]) || []))
      .catch(() => undefined);
  }, [loc, retry]);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setLocError("");
    try {
      const l = await requestLocation();
      setStoredLocation(l);
      setLoc(l);
    } catch (e) {
      setLocError(e instanceof Error ? e.message : "Could not get your location");
    } finally {
      setLocating(false);
    }
  }, []);

  return (
    <>
      {/* ── location: tappable, drives nearby search ── */}
      <button
        type="button"
        onClick={detectLocation}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left active:bg-slate-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          {locating ? <RefreshCw size={16} className="animate-spin" /> : <MapPin size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-navy-400">Delivering to</span>
          <span className="block truncate text-sm font-semibold text-navy">
            {loc?.label || "Coimbatore, Tamil Nadu"}
          </span>
          {loc?.accuracyM != null && (
            <span className="block text-[10px] text-navy-400">
              GPS &plusmn;{loc.accuracyM} m
            </span>
          )}
        </span>
        <ChevronRight size={16} className="shrink-0 text-navy-400" />
      </button>

      {locError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-xs leading-snug text-amber-800">{locError}</p>
          <button
            type="button"
            onClick={() => {
              setStoredLocation(COIMBATORE);
              setLoc(COIMBATORE);
              setLocError("");
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-800 active:bg-amber-100"
          >
            Use Coimbatore
          </button>
        </div>
      )}

      {/* ── sticky search (rail scrolls away, like Zomato/Instamart) ── */}
      <div className="sticky top-[57px] z-10 -mx-4 mb-3 bg-surface px-4 pb-2 pt-2">
        <button
          type="button"
          onClick={() => nav("/category")}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
        >
          <Search size={18} className="shrink-0 text-navy-400" />
          <span className="flex-1 truncate text-sm text-navy-400">Search for a service or worker</span>
          <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
            Browse
          </span>
        </button>
      </div>

      <div className="rail mb-4">
        {railCategories.map((c) => (
          <Link
            key={c.name}
            to={c.to}
            className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${categoryTint(c.name)}`}>
              <c.Icon size={22} strokeWidth={1.8} />
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-navy">{c.name}</span>
          </Link>
        ))}
      </div>

      {/* ── emergency: stacked so it never overflows on narrow screens ── */}
      <Link
        to="/emergency"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-3.5 active:bg-red-50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Zap size={18} fill="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-red-700">Need help urgently?</span>
          <span className="block text-xs leading-snug text-red-500/90">Verified worker near you, fast</span>
        </span>
        <span className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Emergency</span>
      </Link>

      {/* ── trust strip ── */}
      <div className="rail mb-5">
        {trustPoints.map((t) => (
          <span
            key={t.label}
            className="flex w-[132px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <t.Icon size={15} className="shrink-0 text-brand-600" />
            <span className="text-[11px] font-semibold leading-tight text-navy-600">{t.label}</span>
          </span>
        ))}
      </div>

      {/* ── nearby workers ── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-navy">Top workers near you</h2>
          <Link
            to="/category"
            className="-mr-2 rounded-lg px-2 py-2 text-xs font-semibold text-brand-700 active:bg-brand-50"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[86px] rounded-2xl" />
            <Skeleton className="h-[86px] rounded-2xl" />
            <Skeleton className="h-[86px] rounded-2xl" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <ErrorBox error={error} />
            <Button size="sm" tone="secondary" onClick={() => setRetry((n) => n + 1)}>
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        ) : workers.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-navy-400">No verified workers nearby yet.</p>
            <Button size="sm" className="mt-3" onClick={() => nav("/category")}>
              Explore services
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {workers.slice(0, 5).map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        )}
      </section>

      {/* ── popular services ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-navy">Popular services</h2>
          <Link
            to="/category"
            className="-mr-2 rounded-lg px-2 py-2 text-xs font-semibold text-brand-700 active:bg-brand-50"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[124px] rounded-2xl" />
            <Skeleton className="h-[124px] rounded-2xl" />
            <Skeleton className="h-[124px] rounded-2xl" />
            <Skeleton className="h-[124px] rounded-2xl" />
          </div>
        ) : !services.length ? (
          <EmptyState icon="🛠️" title="No services yet" message="Check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {services.slice(0, 6).map((s) => {
              const Icon = categoryIcon(s.category);
              return (
                <Link key={s.id} to={`/services/${s.id}/workers`} className="block">
                  <Card className="flex h-full flex-col p-3.5 active:bg-slate-50">
                    <span className={`mb-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryTint(s.category)}`}>
                      <Icon size={19} strokeWidth={1.9} />
                    </span>
                    <span className="line-clamp-2 text-sm font-bold leading-snug text-navy">{s.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-navy-400">{s.category}</span>
                    <span className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <span className="text-[11px] text-navy-400">
                        <span className="text-sm font-extrabold text-navy">
                          {inr(Number(s.basePrice ?? 0))}
                        </span>{" "}
                        onwards
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-navy-400" aria-hidden />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
