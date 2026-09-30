import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "../lib/api";
import type { Service, WorkerResult } from "../lib/types";
import { BackLink, Button, Card, EmptyState, ErrorBox, Select, Skeleton } from "../components/ui";
import { COIMBATORE, getStoredLocation, hasCoords, locCoords, requestLocation, setStoredLocation } from "../lib/geo";
import { categoryIcon, categoryTint } from "../lib/categories";
import { WorkerCard } from "../components/WorkerCard";

const sortOptions = [
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Highest Rated" },
  { value: "price", label: "Lowest Price" },
];

const filters = [
  { key: "verified", label: "Verified only" },
  { key: "availability", label: "Available now" },
  { key: "experience", label: "5+ years experience" },
];

export default function CategoryPage() {
  const { name = "" } = useParams();
  const [svc, setSvc] = useState<Service | null>(null);
  const [inCategory, setInCategory] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loc, setLoc] = useState(getStoredLocation());
  const [locating, setLocating] = useState(false);
  const [sort, setSort] = useState("distance");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterExp, setFilterExp] = useState(false);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState("15");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api
      .get("/services")
      .then((d) => {
        const all = (d.services as Service[]) ?? [];
        const wanted = name.trim().toLowerCase();
        // match on category OR an exact service name - never fall back to an
        // unrelated service, which used to show "Furniture Assembly" for /category/Electrical
        const inCat = all.filter(
          (s) =>
            (s.category ?? "").toLowerCase() === wanted || s.name.toLowerCase() === wanted
        );
        setInCategory(inCat);
        setSvc(inCat[0] ?? null);
        // no match means we will never fetch workers - stop the skeleton
        if (inCat.length === 0) setLoading(false);
      })
      .catch(() => undefined);
  }, [name]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const l = hasCoords(loc) ? loc! : COIMBATORE;
      const { lat, lng } = locCoords(l);
      const data = await api.get("/search/workers", {
        serviceId: svc?.id,
        category: svc?.category ?? name,
        lat,
        lng,
        radiusKm: Number(radius),
        limit: 30,
        sort,
      });
      let list = (data.workers as WorkerResult[]) || [];
      if (filterVerified) list = list.filter((w) => w.ratingCount > 0);
      if (filterAvailable) list = list.filter((w) => w.isAvailable);
      if (filterExp) list = list.filter((w) => (w.experienceYears ?? 0) >= 5);
      const q = query.trim().toLowerCase();
      if (q) list = list.filter((w) => w.workerName.toLowerCase().includes(q) || w.skills?.some((s) => (s.name ?? "").toLowerCase().includes(q)));
      setWorkers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (svc) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc, sort, filterVerified, filterAvailable, filterExp, radius]);

  async function useLocation() {
    setLocating(true);
    setError("");
    try {
      const l = await requestLocation();
      setLoc(l);
      setStoredLocation(l);
      void load();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Location failed"}. Use Coimbatore to continue.`);
    } finally {
      setLocating(false);
    }
  }

  const label = name.trim();
  const title = label;
  const hasServices = inCategory.length > 0;

  if (!loading && !hasServices) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon="🧰"
          title={`No services in ${label}`}
          message="This category isn't available yet. Browse everything the app offers."
        />
        <div className="mt-4 flex justify-center">
          <Link
            to="/category"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white active:bg-brand-700"
          >
            View all services
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${categoryTint(svc?.category ?? label)}`}>
          {(() => {
            const Icon = categoryIcon(svc?.category ?? label);
            return <Icon size={20} strokeWidth={1.9} />;
          })()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-navy">{title}</h1>
          <p className="text-xs text-navy-400">
            {inCategory.length} service{inCategory.length === 1 ? "" : "s"} · {workers.length} workers
          </p>
        </div>
      </div>

      {inCategory.length > 0 && (
        <div className="rail mb-4">
          {inCategory.map((s) => (
            <Link
              key={s.id}
              to={`/services/${s.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-navy"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
        <Search size={16} className="text-navy-400" />
        <input
          className="flex-1 bg-transparent text-sm text-navy placeholder:text-navy-400 outline-none"
          placeholder="Search by name or skill"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={() => setShowFilters((v) => !v)} className={`p-1.5 rounded-lg ${showFilters ? "bg-brand-100 text-brand-700" : "text-navy-400"}`}>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {showFilters && (
        <Card className="mb-4 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">Filters</span>
            <Button size="sm" tone="ghost" onClick={() => { setFilterVerified(false); setFilterAvailable(false); setFilterExp(false); }}>Reset</Button>
          </div>
          {filters.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={f.key === "verified" ? filterVerified : f.key === "availability" ? filterAvailable : filterExp}
                onChange={(e) => {
                  if (f.key === "verified") setFilterVerified(e.target.checked);
                  if (f.key === "availability") setFilterAvailable(e.target.checked);
                  if (f.key === "experience") setFilterExp(e.target.checked);
                }}
                className="h-4 w-4 accent-brand-600"
              />
              {f.label}
            </label>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-400">Radius</span>
            <Select value={radius} onChange={(e) => setRadius(e.target.value)} className="!w-28">
              <option value="5">5 km</option>
              <option value="15">15 km</option>
              <option value="25">25 km</option>
            </Select>
          </div>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Button size="sm" tone={hasCoords(loc) ? "secondary" : "primary"} loading={locating} onClick={useLocation} className="shrink-0">
          {hasCoords(loc) ? "Refine location" : "Use my location"}
        </Button>
        <Button size="sm" tone="ghost" onClick={usePreset} className="shrink-0">Use Coimbatore</Button>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <span className="text-xs text-navy-400">Sort:</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-32 !py-1.5">
            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {error && <ErrorBox error={error} className="mb-4" />}

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !hasCoords(loc) ? (
        <Card className="p-4 text-sm text-navy-600">
          Enable location or use the Coimbatore preset to find nearby workers.
        </Card>
      ) : workers.length === 0 ? (
        <EmptyState icon="🔍" title="No workers found" message="Try a larger radius or different filters." />
      ) : (
        <div className="space-y-3">
          {workers.map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
      )}
    </>
  );

  function usePreset() {
    setStoredLocation(COIMBATORE);
    setLoc(COIMBATORE);
    void load();
  }
}
