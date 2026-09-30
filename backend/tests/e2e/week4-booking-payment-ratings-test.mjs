const BASE = "http://localhost:4000/api";
let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

async function api(path, method = "GET", { token, body, query } = {}) {
  const url = BASE + path + (query ? "?" + new URLSearchParams(query) : "");
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, data };
}

async function login(identifier, password) {
  const r = await api("/auth/login", "POST", { body: { identifier, password } });
  if (r.status !== 200) throw new Error(`login failed for ${identifier}: ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

const COIMBATORE = { lat: 11.0168, lng: 76.9558 };
const FUTURE = (hours = 24) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

(async () => {
  console.log("== Week 4 verification (matching, booking, scheduling, notifications) ==");

  const customer = await login("9876500001", "customer@123");
  const ramesh = await login("9876500002", "worker@123");
  const sita = await login("9876500003", "worker@123");
  const adminCoimbatore = await login("coimbatore.admin@coop.example", "admin@12345");
  const adminChennai = await login("chennai.admin@coop.example", "admin@12345");
  const adminFed = await login("federation@coop.example", "admin@12345");

  const services = (await api("/services", "GET", { token: customer })).data.services;
  const emergencyPlumbing = services.find((s) => s.name === "Emergency Plumbing");
  const plumbingRepair = services.find((s) => s.name === "Plumbing Repair");
  const electricalInstall = services.find((s) => s.name === "Electrical Installation");
  const homeDeepCleaning = services.find((s) => s.name === "Home Deep Cleaning");

  // ---------- 1. Matching engine ----------
  const m1 = await api("/matching/workers", "GET", { token: customer, query: { serviceId: emergencyPlumbing.id, lat: COIMBATORE.lat, lng: COIMBATORE.lng, radiusKm: 25, limit: 5, priority: "normal" } });
  check("matching normal returns Ramesh first", m1.status === 200 && m1.data.candidates[0]?.worker.workerName === "Ramesh Plumber", JSON.stringify(m1.data));
  const c0 = m1.data.candidates[0];
  const b = c0.breakdown;
  const expectedNormal = 0.35 * b.skill + 0.25 * b.distance + 0.2 * b.availability + 0.1 * b.rating + 0.1 * b.reliability;
  check("normal weights 35/25/20/10/10 recompute", Math.abs(c0.score - expectedNormal) < 1e-4 && c0.score > 0 && c0.score <= 1, JSON.stringify(c0));
  check("candidates sorted desc", m1.data.candidates.every((c, i, arr) => i === 0 || arr[i - 1].score >= c.score));
  check("breakdown skill score from experience", b.skill === 1, `skill=${b.skill}`);

  const me1 = await api("/matching/workers", "GET", { token: customer, query: { serviceId: emergencyPlumbing.id, lat: COIMBATORE.lat, lng: COIMBATORE.lng, radiusKm: 25, priority: "emergency" } });
  const c0e = me1.data.candidates[0];
  const be = c0e.breakdown;
  const expectedEmergency = 0.2 * be.skill + 0.35 * be.distance + 0.3 * be.availability + 0.1 * be.rating + 0.05 * be.reliability;
  check("emergency re-weighted 20/35/30/10/5", Math.abs(c0e.score - expectedEmergency) < 1e-4, JSON.stringify(c0e));

  const m2 = await api("/matching/workers", "GET", { token: customer, query: { category: "Carpentry", lat: 11.0028, lng: 76.9328, radiusKm: 10, limit: 5 } });
  check("matching category=Carpentry finds Murugan", m2.status === 200 && m2.data.candidates.some((c) => c.worker.workerName === "Murugan Carpenter"));

  const mbad = await api("/matching/workers", "GET", { token: customer, query: { lat: COIMBATORE.lat, lng: COIMBATORE.lng } });
  check("matching without serviceId/category -> 400", mbad.status === 400);

  // ---------- 2. Booking: auto-match + lifecycle ----------
  const bk1 = await api("/bookings", "POST", { token: customer, body: { serviceId: emergencyPlumbing.id, scheduledStart: FUTURE(24), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Sai Baba Colony, Coimbatore", priority: "normal", radiusKm: 25 } });
  check("create auto-matched booking", bk1.status === 201 && bk1.data.booking.status === "requested" && bk1.data.booking.workerName === "Ramesh Plumber", JSON.stringify(bk1.data));
  check("booking number GIG- format", /^GIG-\d{6}-[A-Z0-9]{4}$/.test(bk1.data.booking.bookingNumber));
  check("normal price = base price (500)", bk1.data.booking.price === 500, `price=${bk1.data.booking.price}`);

  const overlap = await api("/bookings", "POST", { token: customer, body: { serviceId: emergencyPlumbing.id, scheduledStart: FUTURE(24), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Sai Baba Colony, Coimbatore" } });
  check("overlapping slot -> 409 NO_AVAILABLE_WORKERS", overlap.status === 409, JSON.stringify(overlap.data));

  const past = await api("/bookings", "POST", { token: customer, body: { serviceId: emergencyPlumbing.id, scheduledStart: new Date(Date.now() - 3600 * 1000).toISOString(), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Coimbatore" } });
  check("normal booking in past -> 400", past.status === 400);

  // ---------- 3. Booking: explicit worker + schedule validation ----------
  const bk2 = await api("/bookings", "POST", { token: customer, body: { serviceId: electricalInstall.id, workerId: (await api("/workers/me", "GET", { token: sita })).data.profile.id, scheduledStart: FUTURE(30), scheduledEnd: new Date(Date.now() + 32 * 3600 * 1000).toISOString(), latitude: 16.5329, longitude: 80.4533, address: "Vijayawada One" } });
  check("explicit worker booking (Sita)", bk2.status === 201 && bk2.data.booking.workerName === "Sita Electrician", JSON.stringify(bk2.data));

  const badEnd = await api("/bookings", "POST", { token: customer, body: { serviceId: electricalInstall.id, workerId: (await api("/workers/me", "GET", { token: sita })).data.profile.id, scheduledStart: FUTURE(40), scheduledEnd: FUTURE(39), latitude: 16.5329, longitude: 80.4533, address: "Vijayawada" } });
  check("end before start -> 400", badEnd.status === 400);

  const rameshId = (await api("/workers/me", "GET", { token: ramesh })).data.profile.id;
  const skillMismatch = await api("/bookings", "POST", { token: customer, body: { serviceId: homeDeepCleaning.id, workerId: rameshId, scheduledStart: FUTURE(50), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "R.S. Puram" } });
  check("explicit worker w/o required skill -> 400", skillMismatch.status === 400);

  // ---------- 4. Status transitions ----------
  const sitaTake = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: sita, body: { status: "accepted" } });
  check("other worker cannot accept -> 403", sitaTake.status === 403);
  const custAccept = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: customer, body: { status: "accepted" } });
  check("customer cannot accept -> 403", custAccept.status === 403);
  const accept = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: ramesh, body: { status: "accepted" } });
  check("worker accepts", accept.status === 200 && accept.data.booking.status === "accepted", JSON.stringify(accept.data));
  const bogus = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: ramesh, body: { status: "completed" } });
  check("accepted -> completed rejected (must go through in_progress)", bogus.status === 400);
  const inProgress = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: ramesh, body: { status: "in_progress" } });
  const complete = await api(`/bookings/${bk1.data.booking.id}/status`, "PATCH", { token: ramesh, body: { status: "completed" } });
  check("worker completes", complete.status === 200 && complete.data.booking.status === "completed", JSON.stringify(complete.data));

  const cancel = await api(`/bookings/${bk2.data.booking.id}/status`, "PATCH", { token: customer, body: { status: "cancelled", reason: "changed plans" } });
  check("customer cancels own requested booking", cancel.status === 200 && cancel.data.booking.status === "cancelled", JSON.stringify(cancel.data));

  // coop admin cancels an accepted booking
  const bk3 = await api("/bookings", "POST", { token: customer, body: { serviceId: plumbingRepair.id, workerId: rameshId, scheduledStart: FUTURE(60), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Gandhipuram" } });
  await api(`/bookings/${bk3.data.booking.id}/status`, "PATCH", { token: ramesh, body: { status: "accepted" } });
  const adminCancel = await api(`/bookings/${bk3.data.booking.id}/status`, "PATCH", { token: adminCoimbatore, body: { status: "cancelled", reason: "coop override" } });
  check("coop admin cancels accepted booking", adminCancel.status === 200 && adminCancel.data.booking.status === "cancelled", JSON.stringify(adminCancel.data));

  // ---------- 5. RBAC on booking views ----------
  const custList = await api("/bookings", "GET", { token: customer });
  check("customer sees own bookings", custList.status === 200 && custList.data.bookings.every((b) => b.customerId.length > 0) && custList.data.count >= 3, `count=${custList.data.count}`);
  const rameshList = await api("/bookings", "GET", { token: ramesh });
  check("worker sees assigned bookings", rameshList.data.bookings.every((b) => b.workerName === "Ramesh Plumber"));
  const sitaList = await api("/bookings", "GET", { token: sita });
  check("worker only sees own (Sita)", sitaList.data.bookings.every((b) => b.workerName === "Sita Electrician"));

  const crossView = await api(`/bookings/${bk2.data.booking.id}`, "GET", { token: ramesh });
  check("Ramesh cannot view Sita's booking -> 403", crossView.status === 403);
  const coopView = await api(`/bookings/${bk1.data.booking.id}`, "GET", { token: adminCoimbatore });
  check("coop admin views own coop booking", coopView.status === 200);
  const chennaiView = await api(`/bookings/${bk1.data.booking.id}`, "GET", { token: adminChennai });
  check("other coop admin blocked -> 403", chennaiView.status === 403);
  const fedList = await api("/bookings", "GET", { token: adminFed });
  check("federation admin sees all bookings", fedList.status === 200 && fedList.data.count >= custList.data.count, `count=${fedList.data.count}`);
  const coopList = await api("/bookings", "GET", { token: adminCoimbatore });
  check("coop admin sees coop bookings", coopList.data.count >= 3, `count=${coopList.data.count}`);

  // ---------- 6. Emergency pricing ----------
  const bkE = await api("/bookings", "POST", { token: customer, body: { serviceId: plumbingRepair.id, workerId: rameshId, scheduledStart: new Date(Date.now() + 2 * 60 * 1000).toISOString(), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Race Course" , priority: "emergency" } });
  check("emergency price = base * 1.2 (360)", bkE.status === 201 && bkE.data.booking.price === 360, JSON.stringify(bkE.data));
  await api(`/bookings/${bkE.data.booking.id}/status`, "PATCH", { token: customer, body: { status: "cancelled" } });

  // ---------- 7. Notifications ----------
  const rameshUnread = await api("/notifications/unread-count", "GET", { token: ramesh });
  check("worker has unread notifications", rameshUnread.status === 200 && rameshUnread.data.unreadCount >= 1, JSON.stringify(rameshUnread.data));
  const notifList = await api("/notifications", "GET", { token: ramesh });
  check("list notifications", notifList.status === 200 && notifList.data.notifications.length >= 1);
  const nid = notifList.data.notifications[0].id;
  const wrongRead = await api(`/notifications/${nid}/read`, "PATCH", { token: sita });
  check("cannot mark another user's notification read (404)", wrongRead.status === 404);
  await api(`/notifications/${nid}/read`, "PATCH", { token: ramesh });
  const afterRead = await api("/notifications/unread-count", "GET", { token: ramesh });
  check("unread count decreased after read", afterRead.data.unreadCount === rameshUnread.data.unreadCount - 1, `${rameshUnread.data.unreadCount} -> ${afterRead.data.unreadCount}`);
  await api("/notifications/read-all", "PATCH", { token: ramesh });
  const zero = await api("/notifications/unread-count", "GET", { token: ramesh });
  check("read-all zeroes unread", zero.data.unreadCount === 0, JSON.stringify(zero.data));
  const custUnread = await api("/notifications/unread-count", "GET", { token: customer });
  check("customer got status-change notifications", custUnread.data.unreadCount >= 1, JSON.stringify(custUnread.data));

  console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err.message);
  process.exit(2);
});