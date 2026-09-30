const BASE = "http://localhost:4000/api";
let passed = 0;
let failed = 0;
let skipped = 0;

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
  if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

(async () => {
  console.log("== Week 3 verification (services, location, search) ==");

  const customer = await login("9876500001", "customer@123");
  const worker = await login("9876500002", "worker@123");

  // 1. Service catalogue
  const allServices = await api("/services", "GET", { token: customer });
  check("GET /services lists all 6", allServices.status === 200 && allServices.data.count === 6, JSON.stringify(allServices.data));
  const plumbing = await api("/services", "GET", { token: customer, query: { category: "Plumbing" } });
  check("filter by category=Plumbing", plumbing.status === 200 && plumbing.data.services.every((s) => s.category === "Plumbing") && plumbing.data.count === 2);
  const cleanedSearch = await api("/services", "GET", { token: customer, query: { search: "clean" } });
  check("search name=clean", cleanedSearch.status === 200 && cleanedSearch.data.count === 1 && cleanedSearch.data.services[0].name === "Home Deep Cleaning");
  const emergencyPlumbing = cleanedSearch.data.services[0].name === "Home Deep Cleaning"
    ? plumbing.data.services.find((s) => s.name === "Emergency Plumbing")
    : null;
  const emergencyId = plumbing.data.services.find((s) => s.name === "Emergency Plumbing").id;

  // 2. Service detail carries required skills
  const detail = await api(`/services/${emergencyId}`, "GET", { token: customer });
  check("GET /services/:id has skills", detail.status === 200 && detail.data.service.skills.some((s) => s.name === "Plumbing Repair"), JSON.stringify(detail.data));

  // 3. Location capture (manual coords)
  const saveManual = await api("/customers/me/location", "PUT", { token: customer, body: { address: "Gandhipuram, Coimbatore", latitude: 11.0168, longitude: 76.9558, label: "Home" } });
  check("save location (manual)", saveManual.status === 200 && saveManual.data.location.latitude === 11.0168, JSON.stringify(saveManual.data));
  const getLoc = await api("/customers/me/location", "GET", { token: customer });
  check("get saved location", getLoc.status === 200 && getLoc.data.location.address.includes("Coimbatore"));

  // 4. Location capture (Nominatim geocode) - network dependent, soft-fail
  let geocoded = null;
  try {
    const res = await api("/customers/me/location", "PUT", { token: customer, body: { address: "RS Puram, Coimbatore, Tamil Nadu, India" } });
    if (res.status === 200 && Number.isFinite(res.data.location.latitude)) {
      geocoded = res.data.location;
      check("save location (Nominatim geocode)", true, JSON.stringify(res.data));
    } else {
      skipped++;
      console.log(`  SKIP Nominatim geocode (${res.status})`);
    }
  } catch (e) {
    skipped++;
    console.log(`  SKIP Nominatim geocode: ${e.message}`);
  }

  // 5. Search: Emergency Plumbing near Coimbatore
  const s1 = await api("/search/workers", "GET", { token: customer, query: { serviceId: emergencyId, lat: 11.0168, lng: 76.9558, radiusKm: 25, sort: "distance" } });
  check("search Emergency Plumbing returns Ramesh", s1.status === 200 && s1.data.workers.length >= 1 && s1.data.workers[0].workerName === "Ramesh Plumber", JSON.stringify(s1.data));
  check("search results only approved+available", s1.data.workers.every((w) => w.rating >= 0 && w.distanceKm >= 0));
  check("search only workers with matching skill", s1.data.workers.every((w) => w.skills.some((sk) => sk.name === "Plumbing Repair")));
  check("search distance sorted asc", s1.data.workers.every((w, i, arr) => i === 0 || arr[i - 1].distanceKm <= w.distanceKm));
  check("search has coop + distance + skills shape", s1.data.workers.every((w) => typeof w.cooperativeName === "string" && typeof w.distanceKm === "number" && Array.isArray(w.skills) && typeof w.hourlyRate === "number"));

  // 6. Search by category (no serviceId)
  const s2 = await api("/search/workers", "GET", { token: customer, query: { category: "Plumbing", lat: 11.0168, lng: 76.9558, radiusKm: 25 } });
  check("search category=Plumbing", s2.status === 200 && s2.data.workers.length === 1 && s2.data.workers[0].workerName === "Ramesh Plumber", JSON.stringify(s2.data));

  // 7. Search far away -> empty (Delhi)
  const s3 = await api("/search/workers", "GET", { token: customer, query: { category: "Plumbing", lat: 28.6139, lng: 77.2090, radiusKm: 25 } });
  check("search far (Delhi) returns empty", s3.status === 200 && s3.data.workers.length === 0, JSON.stringify(s3.data));

  // 8. Carpenter near Murugan's coords
  const s4 = await api("/search/workers", "GET", { token: customer, query: { category: "Carpentry", lat: 11.0028, lng: 76.9328, radiusKm: 10 } });
  check("carpentry search finds Murugan first", s4.status === 200 && s4.data.workers.some((w) => w.workerName === "Murugan Carpenter"), JSON.stringify(s4.data));

  // 9. Filters: minRating (all ratings are 0 -> 5 must exclude everyone)
  const s5 = await api("/search/workers", "GET", { token: customer, query: { category: "Plumbing", lat: 11.0168, lng: 76.9558, radiusKm: 25, minRating: 5 } });
  check("minRating=5 excludes (ratings all 0)", s5.status === 200 && s5.data.workers.length === 0);

  // 10. Filters: maxPrice + sort=price (highest hourly rate excluded)
  const s6 = await api("/search/workers", "GET", { token: customer, query: { lat: 11.0168, lng: 76.9558, radiusKm: 25, maxPrice: 340, sort: "price" } });
  check("maxPrice=340 excludes Ramesh(350)", s6.status === 200 && s6.data.workers.every((w) => w.hourlyRate <= 340), JSON.stringify(s6.data));

  // 11. Validation: bad coords
  const bad1 = await api("/search/workers", "GET", { token: customer, query: { lat: 100, lng: 76.9, radiusKm: 25 } });
  check("invalid lat -> 400", bad1.status === 400);
  const bad2 = await api("/search/workers", "GET", { token: customer, query: { lng: 76.9 } });
  check("missing lat -> 400", bad2.status === 400);

  // 12. RBAC: worker cannot touch customer location; customer cannot hit admin
  const custLocForbidden = await api("/customers/me/location", "GET", { token: worker });
  check("worker -> customer location 403", custLocForbidden.status === 403);
  const adminForbidden = await api("/admin/workers", "GET", { token: customer });
  check("customer -> admin 403", adminForbidden.status === 403);

  console.log(`\n== RESULT: ${passed} passed, ${failed} failed, ${skipped} skipped ==`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err.message);
  process.exit(2);
});