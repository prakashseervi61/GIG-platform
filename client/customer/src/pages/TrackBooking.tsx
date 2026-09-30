import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, MapPin, MessageCircle, Navigation, Phone, UserRound } from "lucide-react";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";
import { BackLink, Button, Card, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime } from "../lib/format";

const timeline = [
  { key: "requested", label: "Request Submitted" },
  { key: "accepted", label: "Booking Accepted" },
  { key: "in_progress", label: "Worker Arriving" },
  { key: "completed", label: "Service Completed" },
];

export default function TrackBooking() {
  const { id = "" } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((d) => setBooking(d.booking as Booking))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  const idx = booking ? Math.max(1, timeline.findIndex((t) => t.key === booking.status)) : 0;

  if (loading) {
    return (
      <><Skeleton className="h-40" /></>
    );
  }
  if (error || !booking) {
    return (
      <>
        <BackLink to="/bookings" />
        <ErrorBox error={error || "Booking not found"} />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <UserRound size={18} />
          </div>
          <div>
            <div className="font-bold text-navy text-sm">{booking.workerName}</div>
            <div className="text-xs text-navy-400">{booking.serviceName}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" tone="secondary">
            <Phone size={14} className="mr-1" /> Call
          </Button>
          <Button size="sm" tone="secondary">
            <MessageCircle size={14} className="mr-1" /> Message
          </Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-2 text-brand-700">
          <Navigation size={18} />
          <span className="text-lg font-extrabold">8 minutes away</span>
          <span className="ml-auto text-sm text-navy-400">{fmtDateTime(booking.scheduledStart)}</span>
        </div>
      </Card>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-surface p-4">
        <div className="relative flex flex-col gap-4 pl-6">
          {timeline.map((t, i) => {
            const done = i < idx;
            const current = i === idx;
            return (
              <div key={t.key} className="relative">
                <span className={`absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${done || current ? "border-brand-600 bg-brand-600" : "border-slate-300 bg-white"}`}>
                  {done && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div className={`text-sm font-semibold ${current ? "text-brand-700" : done ? "text-navy" : "text-navy-400"}`}>{t.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
          <MapPin size={16} className="text-brand-600" />
          Live route
          <span className="ml-auto text-xs font-normal text-navy-400">~4.2 km</span>
        </div>
        <div className="relative h-40 overflow-hidden rounded-xl bg-surface">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <line x1="20" y1="180" x2="300" y2="40" stroke="#2c6e49" strokeWidth="3" strokeDasharray="6 4" />
            <circle cx="20" cy="180" r="6" fill="#0d9488" />
            <circle cx="300" cy="40" r="6" fill="#dc2626" />
          </svg>
          <div className="absolute bottom-2 left-2 rounded-lg bg-white/95 px-2 py-1 text-xs text-navy shadow-sm flex items-center gap-1">
            <Clock size={10} /> ETA 8 min
          </div>
        </div>
      </Card>

      <div className="h-20" />
    </>
  );
}
