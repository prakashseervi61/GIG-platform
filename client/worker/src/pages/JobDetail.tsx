import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";
import { BackLink, Badge, Button, Card, ErrorBox, StatusBadge, StatusStepper } from "../components/ui";
import { Shell } from "../components/shell";
import { fmtDateTime, inr } from "../lib/format";

type BookingState = Booking & { distanceKm?: number };

export default function JobDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/bookings/${id}`);
      setBooking(d.booking as BookingState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!booking || ["completed", "cancelled", "rejected"].includes(booking.status)) return;
    const t = setInterval(() => void load(), 6000);
    return () => clearInterval(t);
  }, [booking, load]);

  async function act(status: string) {
    setActing(status);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActing("");
    }
  }

  if (!booking) return <Shell><BackLink to="/" />{error ? <ErrorBox error={error} /> : <Card className="p-4">Loading…</Card>}</Shell>;

  return (
    <Shell>
      <BackLink to="/" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold text-slate-900">{booking.serviceName}</h1>
        <StatusBadge status={booking.status} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
          <Badge tone={booking.priority === "emergency" ? "red" : "slate"}>{booking.priority === "emergency" ? "⚡ emergency" : "normal"}</Badge>
          <span className="font-mono text-xs text-slate-400">{booking.bookingNumber}</span>
        </div>
        <StatusStepper status={booking.status} />
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
          <Row k="Customer" v={booking.customerName} />
          <Row k="Category" v={booking.serviceCategory} />
          <Row k="When" v={fmtDateTime(booking.scheduledStart)} />
          <Row k="Where" v={booking.address} />
          {booking.latitude != null && booking.longitude != null && <Row k="Coordinates" v={`${booking.latitude.toFixed(4)}, ${booking.longitude.toFixed(4)}`} />}
          {booking.notes && <Row k="Notes" v={booking.notes} />}
          {booking.distanceKm != null && booking.distanceKm !== undefined && <Row k="Distance" v={`${booking.distanceKm.toFixed(1)} km`} />}
          <Row k="Payout" v={<span className="font-extrabold text-slate-900">{inr(booking.price)}</span>} />
        </dl>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        {booking.status === "requested" && (
          <>
            <Button className="flex-1" loading={acting === "accepted"} onClick={() => act("accepted")}>✓ Accept job</Button>
            <Button className="flex-1" tone="danger" loading={acting === "rejected"} onClick={() => act("rejected")}>Decline</Button>
          </>
        )}
        {booking.status === "accepted" && <Button className="w-full" tone="amber" loading={acting === "in_progress"} onClick={() => act("in_progress")}>▶ Start work</Button>}
        {booking.status === "in_progress" && <Button className="w-full" tone="green" loading={acting === "completed"} onClick={() => act("completed")}>✓ Mark complete</Button>}
        {booking.status === "completed" && (
          <Button className="w-full" tone="ghost" onClick={() => nav("/earnings")}>View payout in earnings</Button>
        )}
      </div>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right text-slate-800">{v}</dd>
    </div>
  );
}