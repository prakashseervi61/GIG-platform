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
  if (r.status !== 200) throw new Error(`login failed for ${identifier}: ${r.status} ${JSON.stringify(r.data)}`);
  return { access: r.data.accessToken, refresh: r.data.refreshToken, user: r.data.user };
}

(async () => {
  console.log("== Week 2 verification ==");

  const worker = await login("9876500002", "worker@123");
  console.log("  logged in as", worker.user.name, worker.user.role);

  // 1. Get worker skills catalog
  const skills = await api("/skills", "GET", { token: worker.access });
  check("GET /skills returns catalog", skills.status === 200 && skills.data.skills.length >= 3, JSON.stringify(skills.data));

  // 2. Worker profile (me)
  const me = await api("/workers/me", "GET", { token: worker.access });
  check("GET /workers/me", me.status === 200 && !!me.data.profile?.id, JSON.stringify(me.data));
  const wid = me.data.profile.id;
  check("worker has skills from seed", me.data.skills.length >= 1);
  check("worker is approved", me.data.profile.verificationStatus === "approved");

  // 3. Update profile
  const upd = await api(`/workers/${wid}`, "PUT", { token: worker.access, body: { hourlyRate: 400, experienceYears: 6, latitude: 11.028, longitude: 76.971 } });
  check("PUT profile", upd.status === 200 && upd.data.worker.hourlyRate === 400, JSON.stringify(upd.data));

  // 4. Availability toggle
  const off = await api(`/workers/${wid}/availability`, "PATCH", { token: worker.access, body: { isAvailable: false } });
  check("availability off", off.status === 200 && off.data.worker.isAvailable === false, JSON.stringify(off.data));
  const on = await api(`/workers/${wid}/availability`, "PATCH", { token: worker.access, body: { isAvailable: true } });
  check("availability on", on.status === 200 && on.data.worker.isAvailable === true);

  // 5. Add skill (Home Cleaning) then remove
  const cleaningSkill = skills.data.skills.find((s) => s.name === "Home Cleaning");
  const addSkill = await api(`/workers/${wid}/skills`, "POST", { token: worker.access, body: { skillId: cleaningSkill.id, experienceLevel: 3 } });
  check("add skill", addSkill.status === 201, JSON.stringify(addSkill.data));
  const removeSkill = await api(`/workers/${wid}/skills/${cleaningSkill.id}`, "DELETE", { token: worker.access });
  check("remove skill", removeSkill.status === 200, JSON.stringify(removeSkill.data));
  const addBadSkill = await api(`/workers/${wid}/skills`, "POST", { token: worker.access, body: { skillId: "00000000-0000-0000-0000-000000000000" } });
  check("add bogus skill -> 400", addBadSkill.status === 400);

  // 6. Add certification (pending)
  const cert = await api(`/workers/${wid}/certifications`, "POST", { token: worker.access, body: { issuer: "Coimbatore Plumbers Board", certificateNumber: "CPB-2024-1122", validity: "2027-12-31", issueDate: "2024-01-15" } });
  check("add certification", cert.status === 201 && cert.data.certification.verificationStatus === "pending", JSON.stringify(cert.data));
  const certId = cert.data.certification.id;
  const certs = await api(`/workers/${wid}/certifications`, "GET", { token: worker.access });
  check("list certifications", certs.status === 200 && certs.data.certifications.length >= 1);

  // 7. Public profile hides unverified certifications from other users
  const customer = await login("9876500001", "customer@123");
  const pub = await api(`/workers/${wid}`, "GET", { token: customer.access });
  check("public worker profile", pub.status === 200 && pub.data.profile.id === wid, JSON.stringify(pub.data));
  check("public profile hides pending certs", Array.isArray(pub.data.certifications) && pub.data.certifications.every((c) => c.verificationStatus === "approved"));

  // 8. Customer cannot manage worker data
  const forbidden1 = await api(`/workers/${wid}`, "PUT", { token: customer.access, body: { hourlyRate: 999 } });
  check("customer updating worker -> 403", forbidden1.status === 403, JSON.stringify(forbidden1.data));

  // 9. Worker cannot update another worker's profile (Sita = worker 9876500003)
  const worker2 = await login("9876500003", "worker@123");
  const me2 = await api("/workers/me", "GET", { token: worker2.access });
  const forbidden2 = await api(`/workers/${me2.data.profile.id}`, "PUT", { token: worker.access, body: { hourlyRate: 1 } });
  check("worker editing another worker -> 403", forbidden2.status === 403);

  // 10. Admin: coop admin of Coimbatore
  const admin = await login("coimbatore.admin@coop.example", "admin@12345");
  check("coop admin login role", admin.user.role === "coop_admin");

  // New unassigned pending worker to verify (unique phone to keep test re-runnable)
  const uniquePhone = "98" + Date.now().toString().slice(-8);
  const reg = await api("/auth/register", "POST", { body: { name: "Kavitha Plumber", phone: uniquePhone, password: "worker@123", role: "worker" } });
  check("register new worker", reg.status === 201, JSON.stringify(reg.data));
  const newWorkerToken = reg.data.accessToken;
  const newWorkerMe = await api("/workers/me", "GET", { token: newWorkerToken });
  const newWorkerId = newWorkerMe.data.profile.id;

  // 11. Verification queue
  const queue = await api("/admin/workers", "GET", { token: admin.access, query: { status: "pending" } });
  const pendingFound = queue.data.workers.some((w) => w.id === newWorkerId);
  check("admin queue lists pending worker", queue.status === 200 && pendingFound, JSON.stringify(queue.data));

  // 12. Admin approves worker
  const verify = await api(`/admin/workers/${newWorkerId}/verify`, "PATCH", { token: admin.access, body: { status: "approved", note: "documentation verified" } });
  check("admin approve worker", verify.status === 200 && verify.data.worker.verificationStatus === "approved", JSON.stringify(verify.data));

  // 13. Notification generated for the verified worker
  const notifMe = await api("/workers/me", "GET", { token: newWorkerToken });
  check("worker still accessible after verify", notifMe.status === 200);

  // 14. Customer trying admin action -> 403
  const forbidden3 = await api("/admin/workers", "GET", { token: customer.access });
  check("customer admin access -> 403", forbidden3.status === 403);

  // 15. Coop admin of Chennai cannot approve Coimbatore worker (Ramesh's coop = Coimbatore)
  const adminChennai = await login("chennai.admin@coop.example", "admin@12345");
  const wids = await api(`/workers/${wid}`, "GET", { token: adminChennai.access });
  const forbidden4 = await api(`/admin/workers/${wid}/verify`, "PATCH", { token: adminChennai.access, body: { status: "rejected" } });
  check("cross-coop verify -> 403", wids.data.profile.cooperativeName === "Coimbatore Workers Cooperative" && forbidden4.status === 403, JSON.stringify(forbidden4.data));

  // 16. Admin verifies certification (use Chennai.example: Ramesh is in Coimbatore so cert verify must also be scoped)
  // Instead verify cert of the Coimbatore worker WITH the Coimbatore admin
  const verifyCert = await api(`/admin/workers/${wid}/certifications/${certId}/verify`, "PATCH", { token: admin.access, body: { status: "approved" } });
  check("admin approve certification", verifyCert.status === 200 && verifyCert.data.certification.verificationStatus === "approved", JSON.stringify(verifyCert.data));

  // 17. Now public profile shows the approved cert
  const pub2 = await api(`/workers/${wid}`, "GET", { token: customer.access });
  check("public profile now shows approved cert", pub2.data.certifications.some((c) => c.id === certId && c.verificationStatus === "approved"));

  console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err.message);
  process.exit(2);
});