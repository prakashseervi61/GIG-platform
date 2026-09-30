import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";
import { Button, Card, ErrorBox, Skeleton, StarRating } from "../components/ui";

const quickTags = ["Professional", "On Time", "Friendly", "Skilled", "Good Value"];

export default function RateWorker() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((d) => setBooking(d.booking as Booking))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit() {
    setBusy(true);
    try {
      await api.post("/ratings", { bookingId: id, rating, comment: comment || undefined });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <><Skeleton className="h-40" /></>;
  }
  if (error || !booking) {
    return <><ErrorBox error={error} /></>;
  }
  if (done) {
    return (
      <>
        <div className="mt-12 flex flex-col items-center text-center">
          <CheckCircle2 size={56} className="text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Thanks for your feedback!</h1>
          <p className="mt-2 text-sm text-navy-600">Your rating helps the cooperative grow.</p>
          <Button className="mt-6" onClick={() => nav("/bookings")}>Back to bookings</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-navy">How was your experience?</h1>
        <p className="text-sm text-navy-400">{booking.serviceName} · {booking.workerName}</p>
      </div>

      <Card className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-navy">{rating}.0</span>
          <StarRating value={rating} onChange={setRating} size="text-3xl" />
        </div>
      </Card>

      <Card className="mb-4 p-4 space-y-3">
        <p className="text-sm font-bold text-navy">Was the worker {`"professional"`}?</p>
        <div className="flex flex-wrap gap-2">
          {quickTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTags((s) => (active ? s.filter((x) => x !== tag) : [...s, tag]))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-brand-600 text-white" : "bg-surface text-navy-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4 p-4 space-y-3">
        <label className="block text-sm font-medium text-navy">Tell us about your experience</label>
        <textarea
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 min-h-[80px]"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What went well? Any improvements?"
        />
      </Card>

      <Button className="w-full" size="lg" loading={busy} onClick={submit}>
        Submit Review
      </Button>

      {error && <ErrorBox error={error} className="mt-4" />}
    </>
  );
}
