import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Service, WorkerResult, WorkerProfile } from "../lib/types";
import { BackLink, Badge, Button, Card, ErrorBox, Field, Input, Select, Textarea } from "../components/ui";
import { COIMBATORE, getStoredLocation, hasCoords, locCoords, locLabel, requestLocation, setStoredLocation } from "../lib/geo";

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Book() {
  const [params] = useSearchParams();
  const serviceId = params.get("serviceId") || "";
  const workerIdParam = params.get("workerId") || "";
  const emergencyParam = params.get("emergency");
  const nav = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [svc, setSvc] = useState<Service | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | WorkerResult | null>(null);
  const [autoMatch, setAutoMatch] = useState(!workerIdParam);
  const [loc, setLoc] = useState(getStoredLocation());
  const [locating, setLocating] = useState(false);
  const [priority, setPriority] = useState<"normal" | "emergency">(emergencyParam === "1" ? "emergency" : "normal");
  const [start, setStart] = useState(() => toLocalInput(new Date(Date.now() + 2 * 3600 * 1000)));
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [radius, setRadius] = useState("15");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/services").then((d) => {
      setServices(d.services as Service[]);
      if (serviceId) setSvc((d.services as Service[]).find((s) => s.id === serviceId) ?? null);
      else setSvc((d.services as Service[])[0] ?? null);
    }).catch(() => undefined);
  }, [serviceId]);

  useEffect(() => {
    if (workerIdParam) {
      setAutoMatch(false);
      api.get(`/workers/${workerIdParam}`)
        .then((d) => setWorker(d.profile as WorkerProfile))
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load worker"));
    }
  }, [workerIdParam]);

  const canEmergency = svc?.emergencyAvailable ?? false;
  const price = Number(svc?.basePrice ?? 0);
  const total = price * (priority === "emergency" ? 1.2 : 1);
  const workerDisplayName = worker ? ("name" in worker ? worker.name : worker.workerName) : "";

  async function useLocation() {
    setLocating(true);
    setError("");
    try {
      const l = await requestLocation();
      setLoc(l);
      if (!address) setAddress(l.label || "Current location");
    } catch {
      setError("Location failed — using Coimbatore preset.");
      setStoredLocation(COIMBATORE);
      setLoc(COIMBATORE);
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!svc) return setError("Choose a service first.");
    if (!hasCoords(loc)) return setError("Enable location to place the booking.");
    if (!start) return setError("Pick a date and time.");
    if (priority === "emergency" && !canEmergency) return setError("This service doesn't support emergency booking.");
    setBusy(true);
    try {
      const data = await api.post("/bookings", {
        serviceId: svc.id,
        workerId: autoMatch ? undefined : worker?.id,
        scheduledStart: new Date(start).toISOString(),
        ...locCoords(loc!),
        address,
        priority,
        radiusKm: Number(radius),
        notes: notes || undefined
      });
      nav(`/bookings/${data.booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setBusy(false);
    }
  }

  return (
    <>
      <BackLink to={svc ? `/services/${svc.id}` : "/"} />
      <h1 className="mb-4 text-2xl font-extrabold text-slate-900">Book a service</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="space-y-4 p-4">
          <Field label="Service">
            <Select value={svc?.id ?? ""} onChange={(e) => setSvc(services.find((s) => s.id === e.target.value) ?? null)}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} — ₹{Number(s.basePrice ?? 0)}</option>)}
            </Select>
          </Field>

          <Field label="Assign">
            <Select value={autoMatch ? "auto" : worker?.id} onChange={(e) => setAutoMatch(e.target.value === "auto")}>
              <option value="auto">Auto-assign best match</option>
              {worker && <option value={worker.id}>{workerDisplayName}</option>}
            </Select>
          </Field>
          {(autoMatch && !workerIdParam) && (
            <p className="-mt-1 text-xs text-slate-400">We'll rank nearby verified workers by skill, distance, availability, rating and reliability.</p>
          )}
          {!autoMatch && worker && (
            <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <span className="font-semibold">{workerDisplayName}</span> · {worker.cooperativeName ?? "Independent"} · ₹{worker.hourlyRate}/hr
            </div>
          )}

          <Field label="When" hint="Local time">
            <Input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>

          <Field label="Address">
            <Input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder={loc?.label || "Enter job address"} />
          </Field>

          {hasCoords(loc) && loc && (
            <p className="-mt-1 text-xs text-slate-400">📍 {locLabel(loc)} ({(loc.latitude ?? 0).toFixed(4)}, {(loc.longitude ?? 0).toFixed(4)})</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" tone="secondary" loading={locating} onClick={useLocation}>📍 Use my location</Button>
            <Button type="button" size="sm" tone="ghost" onClick={() => { setStoredLocation(COIMBATORE); setLoc(COIMBATORE); setAddress("Probe St, Coimbatore"); }}>Coimbatore</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Search radius">
              <Select value={radius} onChange={(e) => setRadius(e.target.value)}>
                <option value="10">10 km</option>
                <option value="15">15 km</option>
                <option value="25">25 km</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as "normal" | "emergency")}>
                <option value="normal">Normal</option>
                <option value="emergency" disabled={!canEmergency}>Emergency ⚡{!canEmergency && " (n/a)"}</option>
              </Select>
            </Field>
          </div>

          <Field label="Notes for the worker (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. kitchen sink leaking" />
          </Field>
        </Card>

        {error && <ErrorBox error={error} />}

        <Card className="p-4">
          <div className="flex justify-between text-sm text-slate-500"><span>Service price</span><span>₹{price.toLocaleString("en-IN")}</span></div>
          {priority === "emergency" && (
            <div className="flex justify-between text-sm text-red-600"><span>⚡ Emergency surcharge (×1.2)</span><span>+₹{(price * 0.2).toLocaleString("en-IN")}</span></div>
          )}
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold text-slate-900"><span>Estimated total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
          <Button type="submit" loading={busy} className="mt-4 w-full" size="lg">
            {!autoMatch && worker ? `Book ${workerDisplayName.split(" ")[0]}` : "Request booking"}
          </Button>
        </Card>

        {priority === "emergency" && canEmergency && <Badge tone="red">⚡ Emergency bookings are dispatched faster with priority matching.</Badge>}
      </form>
    </>
  );
}