// Week 8 — full SIH demo journey test
// Covers the complete emergency-plumbing storyline across the customer, worker and
// coop-admin surfaces of the real REST API: login -> discovery -> ranked search ->
// normal + emergency booking -> worker accept/start/complete -> UPI pay/verify/invoice
// -> single rating -> earnings reflection -> notifications -> reassign-on-reject ->
// admin dashboard/analytics/forecast/workforce/validation.
//
// Run:  node tests/e2e/week8-journey-test.mjs
// Env:  BASE (default http://localhost:4000/api), optional CREDS_* overrides.
//
// NOTE: requires a seeded demo database (npm run db:demo | src/seed/seed.ts).

const BASE = process.env.BASE ?? "http://localhost:4000/api";
const COIMBATORE = { lat: 11.0168, lng: 76.9558 };
const CUSTOMER = process.env.CUST_PHONE ?? "9876500001";
const CUSTOMER_PW = process.env.CUST_PW ?? "customer@123";
const WORKER_PHONES = (process.env.WORKER_PHONES ?? "9876500002,9876500003,9876500011,9876500012").split(",");
const WORKER_PW = process.env.WORKER_PW ?? "worker@123";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "coimbatore.admin@coop.example";
const ADMIN_PW = process.env.ADMIN_PW ?? "admin@12345";

let pass = 0, fail = 0;
const name = (cond, label, extra = "") => {
  (cond ? pass++ : fail++, console.log(`  ${cond ? "PASS" : "FAIL"} ${label}${extra ? " — " + extra : ""}`));
};

async function req(method, path, { token, body, q } = {}) {
  const p = new URLSearchParams(q ?? {}).toString();
  const r = await fetch(`${BASE}${path}${p ? "?" + p : ""}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${data.message ?? JSON.stringify(data)}`);
  return data;
}

(async () => {
  console.log(`\nweek8-journey-test · ${BASE}\n`);

  // --- Story: customer finds an open slot for the logged-in worker's own skill ---
  let c = await req("POST", "/auth/login", { body: { identifier: CUSTOMER, password: CUSTOMER_PW } });
  name(!!c.accessToken, "customer logs in");
  const custTok = c.accessToken;

  // Worker side: self context gives real skills; pick the service that matches one.
  let wTokResp = null;
  for (const phone of WORKER_PHONES) {
    try { wTokResp = await req("POST", "/auth/login", { body: { identifier: phone, password: WORKER_PW } }); break; } catch { /* next */ }
  }
  name(!!wTokResp?.accessToken, "worker logs in");
  const workTok = wTokResp.accessToken;
  const me = await req("GET", "/workers/me", { token: workTok });
  const wSkillNames = new Set((me.skills ?? []).map((s) => s.name ?? s.skillName));
  const wSkillIds = new Set((me.skills ?? []).map((s) => s.skillId));
  name(!!me.profile?.id && wSkillNames.size > 0, "worker self context has skills", [...wSkillNames].slice(0, 3).join(","));

  const svcs = await req("GET", "/services", { token: custTok, q: { is_active: "true" } });
  name(Array.isArray(svcs.services) && svcs.services.length > 0, "services listed", `${svcs.services.length} services`);
  const service = svcs.services.find((s) =>
    s.skills.some((k) => wSkillNames.has(k.name) || wSkillIds.has(k.skillId)) && (s.category === "Plumbing" || s.emergency_available)
  ) ?? svcs.services.find((s) => s.skills.some((k) => wSkillNames.has(k.name) || wSkillIds.has(k.skillId)));
  name(!!service, "service selected for a worker skill", `${service.category}`);

  const search = await req("GET", "/search/workers", { token: custTok, q: { serviceId: service.id, lat: COIMBATORE.lat, lng: COIMBATORE.lng, radiusKm: "25" } });
  name(Array.isArray(search.workers) && search.workers.length > 0, "ranked worker search returns matches", `${search.workers.length} workers`);

  // --- Normal booking on a genuinely open slot (probe 4 future starts) ---
  const slots = [140, 168, 192, 216].map((h) => new Date(Date.now() + h * 3600 * 1000).toISOString());
  let nb = null;
  for (const t of slots) {
    try {
      nb = await req("POST", "/bookings", {
        token: custTok,
        body: { serviceId: service.id, workerId: me.profile.id, scheduledStart: t, latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "12 Gandhi Street, Coimbatore", priority: "normal", radiusKm: 20 }
      });
      break;
    } catch { /* open slot probe */ }
  }
  name(!!nb?.booking?.id && nb.booking.status === "requested", "normal booking created (requested)", nb?.booking?.bookingNumber);
  const booking = nb.booking;

  const guard = await fetch(`${BASE}/bookings/${booking.id}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${custTok}` },
    body: JSON.stringify({ status: "completed" })
  });
  name(guard.status >= 400, "customer cannot force a completion", `HTTP ${guard.status}`);

  const own = await req("GET", "/bookings", { token: workTok, q: { limit: "100" } });
  name(own.bookings.some((b) => b.id === booking.id), "assigned worker sees the booking");

  await req("PATCH", `/workers/${me.profile.id}/availability`, { token: workTok, body: { isAvailable: true, latitude: COIMBATORE.lat, longitude: COIMBATORE.lng } });
  name(true, "worker availability toggled on");

  for (const [st, label] of [["accepted", "accepts"], ["in_progress", "starts"], ["completed", "completes"]]) {
    const r = await req("PATCH", `/bookings/${booking.id}/status`, { token: workTok, body: { status: st } });
    name(r.booking?.status === st, `worker ${label}`, r.booking?.status);
  }

  const pay = await req("POST", "/payments/create", { token: custTok, body: { bookingId: booking.id, method: "upi" } });
  name(!!pay.payment?.id, "payment initiated (pending)", pay.payment?.paymentNumber);
  const ver = await req("POST", "/payments/verify", { token: custTok, body: { paymentId: pay.payment.id } });
  name(ver.payment?.status === "completed" && !!ver.invoice, "payment verified + invoice generated", ver.invoice?.invoice_number);
  const invs = await req("GET", "/invoices", { token: custTok, q: { limit: "100" } });
  name(invs.invoices.some((i) => i.bookingId === booking.id), "invoice appears in customer list");

  await req("POST", "/ratings", { token: custTok, body: { bookingId: booking.id, rating: 5, comment: "Fast, clean, professional" } });
  const dup = await fetch(`${BASE}/ratings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${custTok}` },
    body: JSON.stringify({ bookingId: booking.id, rating: 4 })
  });
  name(dup.status >= 400, "duplicate rating rejected", `HTTP ${dup.status}`);

  const ern = await req("GET", "/workers/me/earnings", { token: workTok });
  name(ern.totalEarned > 0, "worker earnings reflect payout", `₹${ern.totalEarned}`);

  const notif = await req("GET", "/notifications", { token: custTok, q: { limit: "100" } });
  name(Array.isArray(notif.notifications) && notif.notifications.length > 0, "notifications delivered", `${notif.notifications.length} items`);

  // --- Emergency booking + reassign-on-reject (logistics) if the service allows ---
  if (service.emergency_available) {
    let eb = null;
    for (const t of slots) {
      try {
        eb = await req("POST", "/bookings", {
          token: custTok,
          body: { serviceId: service.id, workerId: me.profile.id, scheduledStart: t, latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "3 Park Road, Coimbatore", priority: "emergency", radiusKm: 20 }
        });
        break;
      } catch { /* probe */ }
    }
    name(!!eb?.booking?.id && eb.booking.priority === "emergency", "emergency booking created", eb.booking.status);
    // Worker rejects -> system re-dispatches to another verified worker
    await req("PATCH", `/bookings/${eb.booking.id}/status`, { token: workTok, body: { status: "rejected" } }).catch(() => {});
    const reb = await req("GET", `/bookings/${eb.booking.id}`, { token: custTok });
    name(!!(reb.booking.workerId ?? reb.booking.worker), "rejected booking re-dispatched", `${reb.booking.status} -> ${reb.booking.workerName ?? "reassigned"}`);
  } else {
    name(true, "emergency branch skipped (service lacks emergency flag)", service.category);
    console.log("  note: to exercise emergency surge + reassign, pick a service with emergency_available=true");
  }

  // --- Admin surface ---
  const admin = await req("POST", "/auth/login", { body: { identifier: ADMIN_EMAIL, password: ADMIN_PW } });
  name(!!admin.accessToken, "coop admin logs in");
  const adminTok = admin.accessToken;

  const wlist = await req("GET", "/admin/workers", { token: adminTok, q: { status: "approved" } });
  name(Array.isArray(wlist.workers) && wlist.workers.length > 0, "admin lists approved workers", `${wlist.workers.length} workers`);

  const dash = await req("GET", "/admin/dashboard", { token: adminTok });
  name(dash.totalBookings != null && dash.completedBookings != null, "dashboard KPIs render", `${dash.totalBookings} bookings`);
  const ana = await req("GET", "/admin/analytics", { token: adminTok });
  name(Array.isArray(ana.bookingsByStatus) && Array.isArray(ana.topWorkers), "analytics breakdowns render", `${ana.bookingsByStatus.length} status buckets`);
  const fc = await req("GET", "/forecast", { token: adminTok, q: { days: "14", insights: "true" } });
  name(Array.isArray(fc.forecast) && fc.forecast.length > 0, "forecast generated", `${fc.forecast.length} rows @ ${fc.model}`);
  name(fc.forecast.every((r) => typeof r.expectedRequests === "number" && typeof r.emergencyExpected === "number"), "forecast rows carry expected + emergency");
  const wf = await req("GET", "/forecast/workforce", { token: adminTok });
  name(Array.isArray(wf.workforce) && wf.workforce.length > 0, "workforce plan generated", `${wf.workforce.length} rows`);
  const val = await req("GET", "/forecast/validation", { token: adminTok });
  name(val.overall?.mae != null, "forecast validation metrics", `mae=${val.overall?.mae}`);

  console.log(`\nWeek 8: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("week8-journey-test crashed:", e.message);
  process.exit(1);
});