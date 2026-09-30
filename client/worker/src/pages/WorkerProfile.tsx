import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SkillCatalog, WorkerCertification, WorkerProfile, WorkerSkill } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Select, Skeleton } from "../components/ui";
import { Shell } from "../components/shell";

export default function WorkerProfile() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [certs, setCerts] = useState<WorkerCertification[]>([]);
  const [catalog, setCatalog] = useState<SkillCatalog[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");

  const [skillId, setSkillId] = useState("");
  const [skillLevel, setSkillLevel] = useState(5);

  const [issuer, setIssuer] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validity, setValidity] = useState("");

  const load = useCallback(async () => {
    try {
      const [me, cat] = await Promise.all([api.get("/workers/me"), api.get("/skills")]);
      const ctx = me as { profile: WorkerProfile; skills: WorkerSkill[]; certifications: WorkerCertification[] };
      setProfile(ctx.profile);
      setSkills(ctx.skills ?? []);
      setCerts(ctx.certifications ?? []);
      setCatalog((cat.skills as SkillCatalog[]) ?? []);
      setHourlyRate(Number(ctx.profile.hourlyRate ?? 0));
      setExperienceYears(Number(ctx.profile.experienceYears ?? 0));
      setLat(ctx.profile.latitude ?? "");
      setLng(ctx.profile.longitude ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    if (!profile) return;
    setSaving("profile");
    setMessage("");
    try {
      await api.put(`/workers/${profile.id}`, {
        hourlyRate: Number(hourlyRate) || 0,
        experienceYears: Math.round(Number(experienceYears) || 0),
        latitude: lat === "" ? undefined : Number(lat),
        longitude: lng === "" ? undefined : Number(lng)
      });
      setMessage("Profile updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(""); }
  }

  async function addSkill() {
    if (!profile) return;
    setSaving("skill");
    try {
      await api.post(`/workers/${profile.id}/skills`, { skillId, experienceLevel: skillLevel });
      setMessage("Skill added. It will help you rank higher in customer searches.");
      setSkillId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add skill");
    } finally { setSaving(""); }
  }

  async function removeSkill(sid: string) {
    if (!profile) return;
    try {
      await api.del(`/workers/${profile.id}/skills/${sid}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove skill");
    }
  }

  async function addCert() {
    if (!profile) return;
    setSaving("cert");
    try {
      await api.post(`/workers/${profile.id}/certifications`, {
        issuer,
        certificateNumber: certNumber || undefined,
        issueDate: issueDate ? new Date(issueDate).toISOString() : undefined,
        validity: validity ? new Date(validity).toISOString() : undefined
      });
      setMessage("Certification submitted for review by the cooperative.");
      setIssuer(""); setCertNumber(""); setIssueDate(""); setValidity("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add certification");
    } finally { setSaving(""); }
  }

  return (
    <Shell>
      <h1 className="mb-4 text-xl font-extrabold text-slate-900">Worker profile</h1>
      {error && <ErrorBox error={error} className="mb-4" />}
      {message && <Card className="mb-4 p-3 text-sm text-brand-700">{message}</Card>}

      {!profile ? (
        <Card className="p-4">
          <Skeleton className="h-16" />
          <p className="mt-3 text-sm text-slate-500">Finish your profile so customers can find you.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-900">{profile.name}</div>
              <div className="text-xs text-slate-500">★ {Number(profile.rating).toFixed(1)} ({profile.ratingCount}) · {profile.cooperativeName ?? "Independent"}</div>
            </div>
            <Badge tone={profile.verificationStatus === "approved" ? "green" : "amber"}>{profile.isAvailable ? "● available" : "○ offline"}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Hourly rate (₹)">
              <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
            </Field>
            <Field label="Experience (yrs)">
              <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} min={0} max={80} />
            </Field>
            <Field label="Latitude">
              <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))} />
            </Field>
            <Field label="Longitude">
              <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))} />
            </Field>
          </div>
          <Button className="mt-3 w-full" loading={saving === "profile"} onClick={saveProfile}>Save profile</Button>
        </Card>
      )}

      <Card className="mt-4 space-y-3 p-4">
        <h2 className="text-base font-bold text-slate-900">Skills ({skills.length})</h2>
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 && <p className="text-sm text-slate-400">No skills yet — add at least one to be discoverable.</p>}
          {skills.map((sk) => (
            <span key={sk.skillId ?? sk.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-brand-200">
              {sk.name}
              <button className="text-brand-400 hover:text-brand-700" onClick={() => removeSkill(sk.skillId ?? sk.id!)} title="Remove">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="flex-1">
            <option value="">Pick skill…</option>
            {catalog.map((sk) => <option key={sk.id} value={sk.id}>{sk.name}{sk.category ? ` · ${sk.category}` : ""}</option>)}
          </Select>
          <Select value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Button size="sm" loading={saving === "skill"} disabled={!skillId} onClick={addSkill}>+ Add</Button>
        </div>
      </Card>

      <Card className="mt-4 space-y-3 p-4">
        <h2 className="text-base font-bold text-slate-900">Certifications</h2>
        {certs.length === 0
          ? <EmptyState icon="📜" title="No certifications" message="Add a certification (e.g. IPTRA training) for verification." />
          : certs.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
              <div>
                <div className="font-semibold text-slate-800">{c.issuer}</div>
                <div className="text-xs text-slate-400">{c.certificateNumber ?? "—"} · {c.issueDate ? new Date(c.issueDate).toISOString().slice(0, 10) : "—"}</div>
              </div>
              <Badge tone={c.verificationStatus === "approved" ? "green" : c.verificationStatus === "rejected" ? "red" : "amber"}>{c.verificationStatus}</Badge>
            </div>
          ))}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Training issuer"><Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. ITI Coimbatore" /></Field>
          <Field label="Certificate #"><Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} /></Field>
          <Field label="Issue date"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
          <Field label="Valid until"><Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} /></Field>
        </div>
        <Button className="w-full" size="sm" loading={saving === "cert"} disabled={!issuer.trim()} onClick={addCert}>Submit certification</Button>
      </Card>
    </Shell>
  );
}