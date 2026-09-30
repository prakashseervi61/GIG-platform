import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";
import { Button, Card, ErrorBox, Skeleton } from "../components/ui";
import { fmtDateTime } from "../lib/format";

export default function BookingConfirm() {
  const { id = "" } = useParams();
  const nav = useNavigate();
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

  if (loading) {
    return (
      <>
        <Skeleton className="h-40" />
      </>
    );
  }
  if (error || !booking) {
    return (
      <>
        <ErrorBox error={error || "Booking not found"} />
        <Button className="mt-4" onClick={() => nav("/bookings")}>My Bookings</Button>
      </>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-navy">Booking Confirmed</h1>
        <p className="mt-1 text-sm text-navy-600">Your service has been scheduled successfully.</p>
      </div>

      <Card className="mt-6 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Booking ID</span>
          <span className="font-mono font-semibold text-navy">{booking.bookingNumber}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Worker</span>
          <span className="font-semibold text-navy">{booking.workerName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Service</span>
          <span className="font-semibold text-navy">{booking.serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Date</span>
          <span className="font-semibold text-navy">{fmtDateTime(booking.scheduledStart)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-400">Address</span>
          <span className="font-semibold text-navy text-right max-w-[60%]">{booking.address}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
          <span className="text-navy-400">Estimated price</span>
          <span className="font-extrabold text-navy">₹{booking.price.toLocaleString("en-IN")}</span>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button tone="secondary" onClick={() => nav(`/bookings/${id}/track`)}>Track Booking</Button>
        <Button onClick={() => nav(`/bookings/${id}`)}>View Booking Details</Button>
      </div>
    </>
  );
}
