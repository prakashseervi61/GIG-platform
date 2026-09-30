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
const FUTURE = (hours = 2) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

(async () => {
  console.log("== Week 6 verification (ratings, worker earnings, admin dashboard + analytics) ==");

  const customer = await login("9876500001", "customer@123");
  const ramesh = await login("9876500002", "worker@123");
  const sita = await login("9876500003", "worker@123");
  const adminCoimbatore = await login("coimbatore.admin@coop.example", "admin@12345");
  const adminFed = await login("federation@coop.example", "admin@12345");

  const services = (await api("/services", "GET", { token: customer })).data.services;
  const plumbingRepair = services.find((s) => s.name === "Plumbing Repair");
  const electricalRepair = services.find((s) => s.category === "Electrical");
  const rameshId = (await api("/workers/me", "GET", { token: ramesh })).data.profile.id;
  const sitaId = (await api("/workers/me", "GET", { token: sita })).data.profile.id;

  async function makeCompletedBooking({ serviceId, workerId = rameshId, workerTok = ramesh, priority = "normal", hours = 28 }) {
    let created = null;
    for (const h of [28, 60, 92, 124, 156, 188, 220, 252, 284, 316, 348, 380, 412, 444]) {
      const attempt = await api("/bookings", "POST", {
        token: customer,
        body: { serviceId, workerId, scheduledStart: FUTURE(h), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Race Course, Coimbatore", priority }
      });
      if (attempt.status < 400) { created = attempt; break; }
    }
    const bid = created.data.booking.id;
    await api(`/bookings/${bid}/status`, "PATCH", { token: workerTok, body: { status: "accepted" } });
    await api(`/bookings/${bid}/status`, "PATCH", { token: workerTok, body: { status: "in_progress" } });
    const done = await api(`/bookings/${bid}/status`, "PATCH", { token: workerTok, body: { status: "completed" } });
    return { bid, booking: done.data.booking };
  }

  // ---------- 1. Reliability recalculated on completion ----------
  const before = (await api("/workers/me", "GET", { token: ramesh })).data.profile;
  const { bid: rateBooking, booking: completedBooking } = await makeCompletedBooking({ serviceId: plumbingRepair.id });
  const after = (await api("/workers/me", "GET", { token: ramesh })).data.profile;
  check("completed booking created", completedBooking.status === "completed");
  check("reliability score recalculated on completion (0-5)", after.reliability > 0 && after.reliability <= 5, `before=${before.reliability} after=${after.reliability}`);

  // ---------- 2. Earnings before payment ----------
  const earningsBefore = await api("/workers/me/earnings", "GET", { token: ramesh });
  check("earnings endpoint (worker only)", earningsBefore.status === 200 && typeof earningsBefore.data.totalEarned === "number" && Array.isArray(earningsBefore.data.monthly), JSON.stringify(earningsBefore.data));
  const otherRoleEarnings = await api("/workers/me/earnings", "GET", { token: customer });
  check("customer blocked from worker earnings -> 403", otherRoleEarnings.status === 403);
  const noAuthEarnings = await api("/workers/me/earnings", "GET");
  check("earnings requires auth -> 401", noAuthEarnings.status === 401);

  // ---------- 3. Ratings: happy path ----------
  const noAuthRate = await api("/ratings", "POST", { body: { bookingId: rateBooking, rating: 5 } });
  check("rating requires auth -> 401", noAuthRate.status === 401);
  const workerRate = await api("/ratings", "POST", { token: ramesh, body: { bookingId: rateBooking, rating: 5 } });
  check("worker cannot rate (customer only) -> 403", workerRate.status === 403);

  const rate = await api("/ratings", "POST", { token: customer, body: { bookingId: rateBooking, rating: 5, comment: "Excellent work, very punctual" } });
  check("create rating", rate.status === 201 && rate.data.rating.rating === 5, JSON.stringify(rate.data));
  check("worker summary reflects new average", rate.data.workerSummary.rating >= 0 && rate.data.workerSummary.rating <= 5 && rate.data.workerSummary.ratingCount === (before.ratingCount + 1), JSON.stringify(rate.data.workerSummary));

  const doubleRate = await api("/ratings", "POST", { token: customer, body: { bookingId: rateBooking, rating: 4 } });
  check("double rating on same booking -> 409", doubleRate.status === 409);

  // rating a non-completed booking -> 400
  const pending = await api("/bookings", "POST", {
    token: customer,
    body: { serviceId: plumbingRepair.id, workerId: rameshId, scheduledStart: FUTURE(24 * 10), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "RS Puram, Coimbatore" }
  });
  const pendingId = pending.data.booking.id;
  await api(`/bookings/${pendingId}/status`, "PATCH", { token: ramesh, body: { status: "accepted" } });
  const ratePending = await api("/ratings", "POST", { token: customer, body: { bookingId: pendingId, rating: 3 } });
  check("cannot rate a non-completed booking -> 400", ratePending.status === 400);

  // rating someone else's booking -> 403
  const otherPhone = "9876" + String(Date.now()).slice(-6);
  const other = await api("/auth/register", "POST", {
    body: { name: "Test Buyer", phone: otherPhone, password: "customer@123", role: "customer" }
  });
  check("second customer registered", other.status === 201, JSON.stringify(other.data));
  const otherTok = other.data.accessToken;
  const otherCreated = await api("/bookings", "POST", {
    token: otherTok,
    body: { serviceId: electricalRepair.id, workerId: sitaId, scheduledStart: FUTURE(32), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Gandhipuram, Coimbatore" }
  });
  const otherBid = otherCreated.data.booking.id;
  await api(`/bookings/${otherBid}/status`, "PATCH", { token: sita, body: { status: "accepted" } });
  await api(`/bookings/${otherBid}/status`, "PATCH", { token: sita, body: { status: "in_progress" } });
  await api(`/bookings/${otherBid}/status`, "PATCH", { token: sita, body: { status: "completed" } });
  const notOwn = await api("/ratings", "POST", { token: customer, body: { bookingId: otherBid, rating: 5 } });
  check("cannot rate another customer's booking -> 403", notOwn.status === 403);

  // list ratings for a worker
  const listRatings = await api(`/workers/${rameshId}/ratings`, "GET", { token: customer });
  check("list worker ratings", listRatings.status === 200 && listRatings.data.workerName.includes("Ramesh") && listRatings.data.ratings.some((r) => r.bookingId === rateBooking), JSON.stringify(listRatings.data));
  check("rating includes customer name + comment", listRatings.data.ratings[0].customerName && listRatings.data.ratings[0].comment === "Excellent work, very punctual", JSON.stringify(listRatings.data.ratings[0]));
  const noAuthList = await api(`/workers/${rameshId}/ratings`, "GET");
  check("list ratings requires auth -> 401", noAuthList.status === 401);
  const missingWorker = await api(`/workers/00000000-0000-0000-0000-000000000000/ratings`, "GET", { token: customer });
  check("list ratings unknown worker -> 404", missingWorker.status === 404);

  // rating notification delivered to worker
  const workerNotifs = await api("/notifications", "GET", { token: ramesh });
  check("worker got rating_received notification", workerNotifs.data.notifications.some((n) => n.type === "rating_received"), JSON.stringify(workerNotifs.data.notifications.slice(0, 2)));

  // ---------- 4. Pay -> earnings increase ----------
  const beforePayTotal = earningsBefore.data.totalEarned;
  const pay = await api("/payments/create", "POST", { token: customer, body: { bookingId: rateBooking, method: "upi" } });
  const paymentId = pay.data.payment.id;
  const verify = await api("/payments/verify", "POST", { token: customer, body: { paymentId } });
  check("payment verified for rated booking", verify.status === 200 && verify.data.payment.status === "completed", JSON.stringify(verify.data));
  const earningsAfter = await api("/workers/me/earnings", "GET", { token: ramesh });
  check("earnings increased after payment", Number(earningsAfter.data.totalEarned) === Number(beforePayTotal) + completedBooking.price, `before=${beforePayTotal} after=${earningsAfter.data.totalEarned} price=${completedBooking.price}`);
  check("recent transaction present", Array.isArray(earningsAfter.data.recentTransactions) && earningsAfter.data.recentTransactions.length >= 1);

  // ---------- 5. Admin dashboard KPIs ----------
  const dCoimbatore = await api("/admin/dashboard", "GET", { token: adminCoimbatore });
  check("coop admin dashboard", dCoimbatore.status === 200, JSON.stringify(dCoimbatore.data));
  const d = dCoimbatore.data;
  check("KPI: total workers >= 1", d.totalWorkers >= 1, JSON.stringify(d));
  check("KPI: verified <= total", d.verifiedWorkers <= d.totalWorkers);
  check("KPI: bookings >= 1", d.totalBookings >= 1);
  check("KPI: transaction value covers new payment", Number(d.transactionValue) >= Number(earningsAfter.data.totalEarned), `tv=${d.transactionValue} earned=${earningsAfter.data.totalEarned}`);
  check("KPI: avgRating present (0-5)", d.avgRating >= 0 && d.avgRating <= 5);
  check("KPI: emergency counter present", Number.isInteger(d.emergencyBookings));
  const customerDash = await api("/admin/dashboard", "GET", { token: customer });
  check("customers blocked from dashboard -> 403", customerDash.status === 403);

  const dFed = await api("/admin/dashboard", "GET", { token: adminFed });
  check("federation dashboard wider than coop", dFed.data.totalWorkers >= d.totalWorkers && dFed.data.totalBookings >= d.totalBookings, JSON.stringify(dFed.data));

  // ---------- 6. Admin analytics ----------
  const aCoimbatore = await api("/admin/analytics", "GET", { token: adminCoimbatore });
  check("coop admin analytics", aCoimbatore.status === 200, JSON.stringify(aCoimbatore.data));
  const a = aCoimbatore.data;
  check("analytics: bookingsByStatus sums to total", a.bookingsByStatus.reduce((s, r) => s + r.count, 0) === d.totalBookings, JSON.stringify(a.bookingsByStatus));
  check("analytics: bookingsByService has Plumbing Repair", a.bookingsByService.some((r) => r.service === "Plumbing Repair"), JSON.stringify(a.bookingsByService));
  check("analytics: bookingsByCategory has Plumbing", a.bookingsByCategory.some((r) => r.category === "Plumbing"), JSON.stringify(a.bookingsByCategory));
  check("analytics: revenueByDay array", Array.isArray(a.revenueByDay));
  check("analytics: bookingsByDay array", Array.isArray(a.bookingsByDay));
  check("analytics: topWorkers includes Ramesh", a.topWorkers.some((r) => r.name.includes("Ramesh")), JSON.stringify(a.topWorkers));
  const aFed = await api("/admin/analytics", "GET", { token: adminFed });
  check("federation analytics topWorkers covers more", aFed.data.topWorkers.length >= a.topWorkers.length);

  console.log(`\nWeek 6: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();