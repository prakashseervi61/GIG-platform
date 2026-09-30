import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import { api } from "../lib/api";
import type { Service } from "../lib/types";
import { BackLink, Badge, Button, Card, ErrorBox, Skeleton } from "../components/ui";
import { getStoredLocation } from "../lib/geo";

export default function ServiceDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [svc, setSvc] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLocation = Boolean(getStoredLocation()?.latitude);

  useEffect(() => {
    api
      .get(`/services/${id}`)
      .then((d) => setSvc(d.service as Service))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <BackLink />
        <Skeleton className="h-40" />
      </>
    );
  }
  if (error || !svc) {
    return (
      <>
        <BackLink />
        <ErrorBox error={error || "Service not found"} />
      </>
    );
  }

  const price = Number(svc.basePrice ?? 0);

  return (
    <>
      <BackLink />
      <Card className="overflow-hidden">
        <div className="bg-brand-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6 6a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l6-6a4 4 0 0 0 5.6-5.6l-2.5 2.5-2-2 2.5-2.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">{svc.name}</h1>
              <div className="mt-1 text-sm text-brand-100">{svc.category}</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-brand-100 leading-relaxed">{svc.description || "Skilled cooperative worker ready to help."}</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(svc.skills ?? []).slice(0, 4).map((s: { skillId: string; name: string }) => (
              <Badge key={s.skillId} tone="slate">{s.name}</Badge>
            ))}
          </div>

          <div className="rounded-2xl bg-surface p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs font-medium text-navy-400">Estimated starting price</div>
                <div className="mt-0.5 text-2xl font-extrabold text-navy">₹{price.toLocaleString("en-IN")}</div>
              </div>
              <div className="text-right text-xs text-navy-400">
                <div>{svc.emergencyAvailable ? "Emergency surcharge 1.2×" : "Final price set with worker"}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button className="w-full" size="lg" onClick={() => nav(`/services/${id}/workers`)}>
              Find nearby workers
            </Button>
            <Button tone="secondary" className="w-full" disabled={!hasLocation} onClick={() => nav(`/book?serviceId=${id}`)}>
              Book now
            </Button>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
            <div className="flex items-center gap-1.5 text-amber-500">
              <Star size={16} fill="currentColor" />
              <span className="text-sm font-bold text-navy">4.8</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-sm text-navy-600 flex items-center gap-1.5">
              <MapPin size={14} />
              2.3 km away
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-sm font-semibold text-navy">120 jobs</div>
          </div>
        </div>
      </Card>
    </>
  );
}
