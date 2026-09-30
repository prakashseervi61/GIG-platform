import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { api } from "../lib/api";
import type { Rating, WorkerCertification, WorkerProfile, WorkerSkill } from "../lib/types";
import { BackLink, Badge, Button, Card, ErrorBox, Skeleton, StarRating } from "../components/ui";
import { fmtDate, initials } from "../lib/format";

function AvailabilitySlot({ label, available }: { label: string; available: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 ${available ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-navy-400"}`}>
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px]">{available ? "Open" : "Busy"}</span>
    </div>
  );
}

export default function WorkerProfilePage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [certs, setCerts] = useState<WorkerCertification[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [jobs, setJobs] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get(`/workers/${id}`),
      api.get(`/workers/${id}/ratings`),
    ]).then(([p, r]) => {
      if (p.status === "fulfilled") {
        setProfile(p.value.profile as WorkerProfile);
        setSkills((p.value.skills as WorkerSkill[]) || []);
        setCerts((p.value.certifications as WorkerCertification[]) || []);
        setJobs(p.value.noOfJobs ?? 0);
      } else {
        setError("Unable to load worker profile");
      }
      if (r.status === "fulfilled") {
        setRatings((r.value.ratings as Rating[]) || []);
        setAvg(Number(r.value.averageRating) || 0);
        setCount(Number(r.value.ratingCount) || 0);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <>
        <BackLink to="/" />
        <Skeleton className="h-44" /><Skeleton className="mt-3 h-32" />
      </>
    );
  }
  if (error || !profile) {
    return (
      <>
        <BackLink to="/" />
        <ErrorBox error={error} />
      </>
    );
  }

  const availability = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"].map((t, i) => ({
    label: t,
    available: i % 2 === 0,
  }));

  return (
    <>
      <BackLink to="/" />

      <Card className="overflow-hidden">
        <div className="bg-brand-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold">
              {initials(profile.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold">{profile.name}</h1>
                <Badge tone="green">verified</Badge>
              </div>
              <div className="text-sm text-brand-100">{profile.cooperativeName ?? "Independent cooperative"}</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Star size={14} fill="currentColor" className="text-amber-300" />
                <span className="font-bold">{avg || profile.rating}</span>
                <span className="text-brand-100">({count} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white text-center">
          {[
            ["Years", `${profile.experienceYears ?? 0}+`],
            ["Jobs", `${jobs || count * 5}+`],
            ["Rating", (avg || profile.rating).toFixed(1)],
            ["Distance", "2.3 km"],
          ].map(([label, value]) => (
            <div key={label} className="px-1 py-3">
              <div className="text-sm font-extrabold text-navy">{value}</div>
              <div className="text-[10px] text-navy-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="p-4">
          <Button className="w-full" size="lg" onClick={() => nav(`/book?serviceId=&workerId=${profile.id}`)}>
            Book This Worker
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="mb-2 text-base font-extrabold text-navy">Skills</h2>
        <div className="flex flex-wrap gap-1.5">
          {skills.length ? skills.map((s, i) => <Badge key={s.id ?? i} tone="green">{s.name}</Badge>) : <span className="text-sm text-navy-400">Plumbing · Pipe Fitting · Bathroom Repair · Water Tank Installation</span>}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="mb-2 text-base font-extrabold text-navy">About</h2>
        <p className="text-sm text-navy-600 leading-relaxed">
          {profile.name} is an experienced {profile.cooperativeName?.toLowerCase() ?? "cooperative"} worker with {profile.experienceYears ?? 5}+ years of residential and commercial service experience. Known for prompt responses, clean workmanship and fair pricing.
        </p>
      </Card>

      {certs.length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="mb-2 text-base font-extrabold text-navy">Certifications</h2>
          <ul className="space-y-2">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-surface p-3 text-sm">
                <div>
                  <div className="font-semibold text-navy">{c.title}</div>
                  <div className="text-xs text-navy-400">{c.issuingAuthority ?? "CoopGig"}</div>
                </div>
                <Badge tone={c.verificationStatus === "approved" ? "green" : c.verificationStatus === "pending" ? "amber" : "slate"}>
                  {c.verificationStatus === "approved" ? "verified" : c.verificationStatus}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-base font-extrabold text-navy">Reviews {ratings.length > 0 && `(${ratings.length})`}</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-navy-400">No reviews yet — be the first.</p>
        ) : (
          <ul className="space-y-3">
            {ratings.slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-xl bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-navy">{r.workerName || "Anonymous"}</span>
                  <span className="text-[11px] text-navy-400">{fmtDate(r.createdAt)}</span>
                </div>
                <div className="mt-1">
                  <StarRating value={r.rating} size="text-sm" />
                </div>
                {r.comment && <p className="mt-1 text-sm text-navy-600">“{r.comment}”</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="mb-2 text-base font-extrabold text-navy">Available today</h2>
        <div className="grid grid-cols-5 gap-2">
          {availability.map((a) => <AvailabilitySlot key={a.label} {...a} />)}
        </div>
      </Card>

      <div className="h-20" />
    </>
  );
}
