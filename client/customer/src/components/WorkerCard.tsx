import { Link } from "react-router-dom";
import { Star, Navigation } from "lucide-react";
import type { WorkerResult } from "../lib/types";
import { Card } from "./ui";
import { distanceLabel, inr, initials } from "../lib/format";

function ratingTone(r: number) {
  if (r >= 4) return "bg-emerald-600 text-white";
  if (r >= 3.5) return "bg-amber-500 text-white";
  return "bg-rose-500 text-white";
}

/**
 * Two lines only: who they are + how they rate, and what they cost.
 * Experience, job counts and skill chips live on the profile page.
 */
export function WorkerCard({ worker }: { worker: WorkerResult }) {
  const skill = worker.skills?.[0]?.name || "General work";
  return (
    <Link to={`/workers/${worker.id}`} className="block">
      <Card className="flex items-center gap-3.5 p-4 active:bg-slate-50">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-800">
          {initials(worker.workerName)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {worker.isAvailable !== false && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Available now" />
            )}
            <span className="truncate text-[15px] font-bold leading-tight text-navy">{worker.workerName}</span>
          </span>

          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-navy-400">
            <span className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold ${ratingTone(worker.rating)}`}>
              <Star size={9} fill="currentColor" />
              {worker.rating.toFixed(1)}
            </span>
            <span className="truncate">{skill}</span>
            <span className="shrink-0 text-navy-400">·</span>
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Navigation size={9} />
              {distanceLabel(worker.distanceKm)}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-extrabold leading-tight text-navy">{inr(worker.hourlyRate)}</span>
          <span className="block text-[10px] text-navy-400">per hour</span>
        </span>
      </Card>
    </Link>
  );
}
