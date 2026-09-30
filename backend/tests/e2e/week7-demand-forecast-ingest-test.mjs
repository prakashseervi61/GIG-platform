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

(async () => {
  console.log("== Week 7 verification (AI dataset pipeline, forecasting, workforce allocation, validation) ==");

  const fed = await login("federation@coop.example", "admin@12345");
  const coop = await login("coimbatore.admin@coop.example", "admin@12345");
  const customer = await login("9876500001", "customer@123");
  const ramesh = await login("9876500002", "worker@123");

  const COIMBATORE_ZONE = "Coimbatore Workers Cooperative";
  const TODAY = new Date().toISOString().slice(0, 10);

  // ---------- 1. Pipeline rebuild ----------
  const rebuildNoAuth = await api("/forecast/rebuild", "POST");
  check("rebuild requires auth -> 401", rebuildNoAuth.status === 401);
  const rebuildCoop = await api("/forecast/rebuild", "POST", { token: coop });
  check("rebuild is federation_admin only -> 403", rebuildCoop.status === 403);
  const rebuild = await api("/forecast/rebuild", "POST", { token: fed });
  check("rebuild dataset from booking history", rebuild.status === 201 && Number.isInteger(rebuild.data.records) && rebuild.data.records >= 0, JSON.stringify(rebuild.data));

  // ---------- 2. Forecast API ----------
  const noAuth = await api("/forecast");
  check("forecast requires auth -> 401", noAuth.status === 401);
  const cusBlocked = await api("/forecast", "GET", { token: customer });
  check("customer blocked from forecast -> 403", cusBlocked.status === 403);
  const wkBlocked = await api("/forecast/workforce", "GET", { token: ramesh });
  check("worker blocked from workforce -> 403", wkBlocked.status === 403);

  const f = await api("/forecast", "GET", { token: fed, query: { days: 3, category: "Plumbing" } });
  check("forecast (federation)", f.status === 200 && f.data.model === "seasonal-naive-weekday", JSON.stringify(f.data).slice(0, 200));
  check("forecast rows well-formed", Array.isArray(f.data.forecast) && f.data.forecast.length > 0 &&
    f.data.forecast.every((r) => r.date && r.zone && r.category === "Plumbing" && Number.isFinite(r.expectedRequests) && r.label), JSON.stringify(f.data.forecast[0]));
  check("forecast honors days+category filter", f.data.forecast.length === f.data.zones.length * 3, `rows=${f.data.forecast.length} zones=${f.data.zones.length}`);

  const fDate = await api("/forecast", "GET", { token: fed, query: { date: TODAY, days: 1, zone: COIMBATORE_ZONE, category: "Plumbing" } });
  check("zone+date filtering", fDate.status === 200 && fDate.data.forecast.length === 1 && fDate.data.forecast[0].date === TODAY && fDate.data.forecast[0].zone === COIMBATORE_ZONE, JSON.stringify(fDate.data));

  const badZone = await api("/forecast", "GET", { token: fed, query: { zone: "Nonexistent Coop" } });
  check("unknown zone -> 400", badZone.status === 400 && badZone.data.error.code === "UNKNOWN_ZONE", JSON.stringify(badZone.data));
  const badDate = await api("/forecast", "GET", { token: fed, query: { date: "17-09-2026" } });
  check("malformed date -> 400", badDate.status === 400);

  const coopOutOfScope = await api("/forecast", "GET", { token: coop, query: { zone: "Chennai Service Cooperative" } });
  check("coop admin blocked from other zone -> 400", coopOutOfScope.status === 400 && coopOutOfScope.data.error.code === "UNKNOWN_ZONE", JSON.stringify(coopOutOfScope.data));
  const coopForecast = await api("/forecast", "GET", { token: coop, query: { days: 2 } });
  check("coop admin sees only its zones", coopForecast.status === 200 && coopForecast.data.zones.every((z) => z === COIMBATORE_ZONE), JSON.stringify(coopForecast.data.zones));

  // ---------- 3. Workforce allocation ----------
  const wf = await api("/forecast/workforce", "GET", { token: fed, query: { days: 1, zone: COIMBATORE_ZONE, category: "Plumbing" } });
  check("workforce allocation", wf.status === 200 && wf.data.workforce.length === 1, JSON.stringify(wf.data));
  const w = wf.data.workforce[0];
  check("workforce has gap + recommendation", Number.isInteger(w.availableWorkers) && Number.isInteger(w.gap) && w.recommendation.length > 0 && w.recommendedWorkers === Math.ceil(w.expectedRequests / 1), JSON.stringify(w).slice(0, 150));
  check("workforce capacity math (cap=2)", (await api("/forecast/workforce", "GET", { token: fed, query: { days: 1, category: "Plumbing", zone: COIMBATORE_ZONE, capacityPerWorker: 2 } })).data.workforce[0].recommendedWorkers === Math.ceil(w.expectedRequests / 2));
  const badCap = await api("/forecast/workforce", "GET", { token: fed, query: { capacityPerWorker: 0 } });
  check("capacity 0 -> 400", badCap.status === 400);

  // ---------- 4. Validation metrics ----------
  const v = await api("/forecast/validation", "GET", { token: fed });
  check("validation returns metrics", v.status === 200 && typeof v.data.overall.mae === "number" && typeof v.data.overall.mape === "number" && typeof v.data.overall.bias === "number", JSON.stringify(v.data));
  check("validation per-category present", Object.keys(v.data.perCategory).length >= 1, JSON.stringify(v.data.perCategory));
  const vCoop = await api("/forecast/validation", "GET", { token: coop });
  check("coop admin validation works", vCoop.status === 200 && typeof vCoop.data.overall.mape === "number");

  // ---------- 5. Live ingest on booking creation ----------
  const services = (await api("/services", "GET", { token: customer })).data.services;
  const plumbing = services.find((s) => s.name === "Plumbing Repair");
  const rameshId = (await api("/workers/me", "GET", { token: ramesh })).data.profile.id;
  const beforeRow = await (async () => {
    // find an open slot and its forecast date, then read the pre-ingest row
    for (const h of [48, 120, 192, 264, 336]) {
      const start = new Date(Date.now() + h * 3600 * 1000).toISOString();
      const date = start.slice(0, 10);
      const before = (await api("/forecast", "GET", { token: fed, query: { date, days: 1, category: "Plumbing", zone: COIMBATORE_ZONE } })).data.forecast[0];
      const attempt = await api("/bookings", "POST", {
        token: customer,
        body: { serviceId: plumbing.id, workerId: rameshId, scheduledStart: start, latitude: 11.0168, longitude: 76.9558, address: "Probe St, Coimbatore", priority: "normal" }
      });
      if (attempt.status !== 201) continue;
      return { date, h, bid: attempt.data.booking.id, before };
    }
    throw new Error("no open slot found for ingest probe");
  })();
  const { date: bookedDate, bid: normalBid, before } = beforeRow;
  check("ingest-trigger normal booking created", !!normalBid, JSON.stringify(beforeRow).slice(0, 120));
  const afterNormal = (await api("/forecast", "GET", { token: fed, query: { date: bookedDate, days: 1, category: "Plumbing", zone: COIMBATORE_ZONE } })).data.forecast[0];
  check("live ingest: normal booking raises demand forecast", afterNormal.expectedRequests === (before?.expectedRequests ?? 0) + 1, `before=${before?.expectedRequests} after=${afterNormal.expectedRequests}`);
  check("live ingest: normal booking keeps emergency forecast", afterNormal.emergencyExpected === before?.emergencyExpected, `before=${before?.emergencyExpected} after=${afterNormal.emergencyExpected}`);

  const emergency = await (async () => {
    // Anchor the emergency booking to the SAME calendar date as the normal one.
    // Comparing two different dates would mix the emergency signal with the
    // per-date model baseline, which differs by weekday and cannot be equal.
    for (const hour of [10, 11, 13, 14, 16]) {
      const attempt = await api("/bookings", "POST", {
        token: customer,
        body: { serviceId: plumbing.id, workerId: rameshId, scheduledStart: `${bookedDate}T${String(hour).padStart(2, "0")}:00:00.000Z`, latitude: 11.0168, longitude: 76.9558, address: "Probe St, Coimbatore", priority: "emergency" }
      });
      if (attempt.status === 201) return attempt;
    }
    return { status: 409, data: { booking: null } };
  })();
  check("ingest-trigger emergency booking created", emergency.status === 201, JSON.stringify(emergency.data).slice(0, 120));
  const eDate = emergency?.data?.booking?.scheduledStart?.slice(0, 10) ?? bookedDate;
  check("emergency booking lands on the same forecast date as the normal one", eDate === bookedDate, `${bookedDate} vs ${eDate}`);
  const afterEmergency = (await api("/forecast", "GET", { token: fed, query: { date: eDate, days: 1, category: "Plumbing", zone: COIMBATORE_ZONE } })).data.forecast[0];
  // "only" = the emergency booking moves the emergency counter by one and is
  // still counted exactly once as a request, not dropped or double-counted
  check("live ingest: emergency booking raises emergency forecast only", afterEmergency.expectedRequests === afterNormal.expectedRequests + 1 && afterEmergency.emergencyExpected === afterNormal.emergencyExpected + 1, `r=${afterNormal.expectedRequests}->${afterEmergency.expectedRequests} e=${afterNormal.emergencyExpected}->${afterEmergency.emergencyExpected}`);

  console.log(`\nWeek 7: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();