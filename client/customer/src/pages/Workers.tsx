import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { WorkerCard } from "../components/WorkerCard";
import type { Service, WorkerResult } from "../lib/types";
import { BackLink, Button, Card, EmptyState, ErrorBox, Select, Skeleton } from "../components/ui";
import { COIMBATORE, getStoredLocation, hasCoords, locCoords, locLabel, requestLocation, setStoredLocation } from "../lib/geo";

export default function Workers() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const category = params.get("category");
  const [svc, setSvc] = useState<Service | null>(null);
  const [workers, setWorkers] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loc, setLoc] = useState(getStoredLocation());
  const [locating, setLocating] = useState(false);
  const [sort, setSort] = useState("rating");
  const [radius, setRadius] = useState("15");

  useEffect(() => {
    if (id) {
      api.get(`/services/${id}`).then((d) => setSvc(d.service)).catch(() => undefined);
    }
  }, [id]);

  async function load(l = loc) {
    if (!hasCoords(l)) return;
    setLoading(true);
    setError("");
    try {
      const base = category ? { category } : { serviceId: id };
      const data = await api.get("/search/workers", { ...base, ...locCoords(l), radiusKm: Number(radius), limit: 30, sort });
      setWorkers((data.workers as WorkerResult[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id, category, sort, radius, svc?.id]);

  const sorted = useMemo(
    () => [...workers].sort((a, b) => {
      if (sort === "distance") return a.distanceKm - b.distanceKm;
      if (sort === "price") return a.hourlyRate - b.hourlyRate;
      return b.rating - a.rating;
    }),
    [workers, sort]
  );

  async function useLocation() {
    setLocating(true);
    setError("");
    try {
      const l = await requestLocation();
      setLoc(l);
      setStoredLocation(l);
      await load(l);
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Location failed"}. Use Coimbatore to continue.`);
    } finally {
      setLocating(false);
    }
  }

  function usePreset() {
    setStoredLocation(COIMBATORE);
    setLoc(COIMBATORE);
    void load(COIMBATORE);
  }

  const title = svc?.name ?? category ?? "Workers";

  return (
    <>
      <BackLink to={id ? `/services/${id}` : "/"} />
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-navy capitalize">{title}</h1>
          <p className="text-sm text-navy-400">Nearby verified workers · {loc ? locLabel(loc) : "location needed"}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" tone={hasCoords(loc) ? "secondary" : "primary"} loading={locating} onClick={useLocation}>
          {hasCoords(loc) ? "Refine" : "Use my location"}
        </Button>
        <Button size="sm" tone="ghost" onClick={usePreset}>Use Coimbatore</Button>
        <Select value={radius} onChange={(e) => setRadius(e.target.value)} className="!w-28">
          <option value="10">10 km</option>
          <option value="15">15 km</option>
          <option value="25">25 km</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-32">
          <option value="rating">Highest Rated</option>
          <option value="distance">Nearest</option>
          <option value="price">Lowest Price</option>
        </Select>
      </div>

      {error && <ErrorBox error={error} className="mb-4" />}
      {!hasCoords(loc) && !error && (
        <Card className="mb-4 p-4 text-sm text-navy-600">
          Enable location or use Coimbatore preset.
        </Card>
      )}

      {loading && hasCoords(loc) ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !hasCoords(loc) ? null : sorted.length === 0 ? (
        <EmptyState icon="🔎" title="No workers found" message="Try a larger radius." />
      ) : (
        <div className="space-y-3">{sorted.map((w) => <WorkerCard key={w.id} worker={w} />)}</div>
      )}
    </>
  );
}
