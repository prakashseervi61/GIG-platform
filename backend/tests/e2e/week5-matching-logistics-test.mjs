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
  console.log("== Week 5 verification (payment sandbox, invoices, transaction history) ==");

  const customer = await login("9876500001", "customer@123");
  const ramesh = await login("9876500002", "worker@123");
  const adminCoimbatore = await login("coimbatore.admin@coop.example", "admin@12345");
  const adminChennai = await login("chennai.admin@coop.example", "admin@12345");
  const adminFed = await login("federation@coop.example", "admin@12345");

  const services = (await api("/services", "GET", { token: customer })).data.services;
  const plumbingRepair = services.find((s) => s.name === "Plumbing Repair");
  const rameshId = (await api("/workers/me", "GET", { token: ramesh })).data.profile.id;

  async function makeCompletedBooking({ serviceId, priority = "normal", hours = 28 }) {
    const created = await api("/bookings", "POST", {
      token: customer,
      body: { serviceId, workerId: rameshId, scheduledStart: FUTURE(hours), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Race Course, Coimbatore", priority }
    });
    const bid = created.data.booking.id;
    await api(`/bookings/${bid}/status`, "PATCH", { token: ramesh, body: { status: "accepted" } });
    await api(`/bookings/${bid}/status`, "PATCH", { token: ramesh, body: { status: "in_progress" } });
    const done = await api(`/bookings/${bid}/status`, "PATCH", { token: ramesh, body: { status: "completed" } });
    return { bid, booking: done.data.booking };
  }

  // ---------- 1. A completed booking to pay for ----------
  const { bid: payBooking, booking: completedBooking } = await makeCompletedBooking({ serviceId: plumbingRepair.id });
  check("completed booking ready", completedBooking.status === "completed" && completedBooking.price === 300, JSON.stringify(completedBooking));

  // ---------- 2. Payment create (sandbox order) ----------
  const noAuthCreate = await api("/payments/create", "POST", { body: { bookingId: payBooking, method: "upi" } });
  check("create payment requires auth -> 401", noAuthCreate.status === 401);
  const workerCreate = await api("/payments/create", "POST", { token: ramesh, body: { bookingId: payBooking, method: "upi" } });
  check("worker cannot create payment (customer only) -> 403", workerCreate.status === 403);

  const pay = await api("/payments/create", "POST", { token: customer, body: { bookingId: payBooking, method: "upi" } });
  check("create sandbox payment", pay.status === 201 && pay.data.payment.status === "pending", JSON.stringify(pay.data));
  const p = pay.data.payment;
  check("payment number PAY- format", /^PAY-\d{6}-[A-Z0-9]{4}$/.test(p.paymentNumber));
  check("sandbox order id + amount", p.providerOrderId.startsWith("SANDBOX-") && Number(p.amount) === 300);

  const payAgain = await api("/payments/create", "POST", { token: customer, body: { bookingId: payBooking, method: "upi" } });
  check("re-create resumes same pending order", payAgain.status === 201 && payAgain.data.payment.id === p.id && payAgain.data.payment.status === "pending", JSON.stringify(payAgain.data));

  const historyPending = await api("/payments", "GET", { token: customer, query: { status: "pending" } });
  check("pending tx history visible", historyPending.data.payments.some((x) => x.id === p.id));

  // ---------- 3. Verify (spoof / replay protection) ----------
  const wrongUserVerify = await api("/payments/verify", "POST", { token: ramesh, body: { paymentId: p.id } });
  check("worker cannot verify customer's payment -> 403", wrongUserVerify.status === 403);
  const tampered = await api("/payments/verify", "POST", {
    token: customer,
    body: { paymentId: "00000000-0000-0000-0000-000000000000" }
  });
  check("tampered payment id -> 404", tampered.status === 404);

  const verified = await api("/payments/verify", "POST", { token: customer, body: { paymentId: p.id } });
  check("verify succeeds -> invoice generated", verified.status === 200 && verified.data.payment.status === "completed", JSON.stringify(verified.data));
  const inv = verified.data.invoice;
  check("invoice number INV- format", /^INV-\d{6}-[A-Z0-9]{4}$/.test(inv.invoiceNumber));
  check("invoice math (300 no surcharge)", Number(inv.subtotal) === 300 && Number(inv.emergencySurcharge) === 0 && Number(inv.total) === 300);
  check("invoice status paid + paid_at set", inv.status === "paid" && !!verified.data.payment.paidAt);
  check("txn id SB... recorded", /^SB\d+/.test(verified.data.payment.transactionId));

  const replay = await api("/payments/verify", "POST", { token: customer, body: { paymentId: p.id } });
  check("re-verify blocked (replay) -> 409", replay.status === 409, JSON.stringify(replay.data));
  const dupCreate = await api("/payments/create", "POST", { token: customer, body: { bookingId: payBooking, method: "upi" } });
  check("second payment for paid booking -> 409", dupCreate.status === 409);

  // ---------- 4. Invoices RBAC ----------
  const custInvoices = await api("/invoices", "GET", { token: customer });
  check("customer lists invoices", custInvoices.data.invoices.some((i) => i.id === inv.id));
  const invoiceGet = await api(`/invoices/${inv.id}`, "GET", { token: customer });
  check("customer reads invoice", invoiceGet.status === 200 && invoiceGet.data.invoice.bookingId === payBooking);
  const workerInvoice = await api(`/invoices/${inv.id}`, "GET", { token: ramesh });
  check("assigned worker reads invoice", workerInvoice.status === 200);
  const workerInvoiceList = await api("/invoices", "GET", { token: ramesh });
  check("worker lists own invoices", workerInvoiceList.data.invoices.some((i) => i.id === inv.id));
  const coopList = await api("/invoices", "GET", { token: adminCoimbatore });
  check("coop admin lists coop invoices", coopList.data.invoices.some((i) => i.id === inv.id));
  const chennaiBlocked = await api(`/invoices/${inv.id}`, "GET", { token: adminChennai });
  check("other coop blocked from invoice -> 403", chennaiBlocked.status === 403);
  const fedList = await api("/invoices", "GET", { token: adminFed });
  check("federation sees all invoices", fedList.data.invoices.some((i) => i.id === inv.id));

  // ---------- 5. Emergency surcharge on invoice ----------
  const { bid: emBooking } = await makeCompletedBooking({ serviceId: plumbingRepair.id, priority: "emergency", hours: 30 });
  const emPay = await api("/payments/create", "POST", { token: customer, body: { bookingId: emBooking, method: "card" } });
  const emVerified = await api("/payments/verify", "POST", { token: customer, body: { paymentId: emPay.data.payment.id } });
  const eInv = emVerified.data.invoice;
  check("emergency invoice: subtotal 300 + surcharge 60 = 360", Number(eInv.subtotal) === 300 && Number(eInv.emergencySurcharge) === 60 && Number(eInv.total) === 360, JSON.stringify(eInv));

  // ---------- 6. Transaction history ----------
  const tx = await api("/payments", "GET", { token: customer });
  const completed = tx.data.payments.filter((x) => x.status === "completed");
  check("transaction history has completed payments", completed.length >= 2, JSON.stringify({ count: completed.length }));
  const coopTx = await api("/payments", "GET", { token: adminCoimbatore });
  check("coop admin sees coop transactions", coopTx.data.payments.length >= 2);
  const fedTx = await api("/payments", "GET", { token: adminFed });
  check("federation sees all transactions", fedTx.data.payments.length >= 2);

  // ---------- 7. Not payable states ----------
  const fresh = await api("/bookings", "POST", {
    token: customer,
    body: { serviceId: plumbingRepair.id, workerId: rameshId, scheduledStart: FUTURE(50), latitude: COIMBATORE.lat, longitude: COIMBATORE.lng, address: "Gandhipuram" }
  });
  const notPayable = await api("/payments/create", "POST", { token: customer, body: { bookingId: fresh.data.booking.id, method: "upi" } });
  check("payment for requested (unstarted) booking -> 400", notPayable.status === 400, JSON.stringify(notPayable.data));
  await api(`/bookings/${fresh.data.booking.id}/status`, "PATCH", { token: customer, body: { status: "cancelled" } });

  // ---------- 8. Notifications ----------
  const notifsC = await api("/notifications", "GET", { token: customer });
  check("customer got payment_success notifications", notifsC.data.notifications.filter((n) => n.type === "payment_success").length >= 1, JSON.stringify(notifsC.data.notifications.map((n) => n.type)));
  const notifsW = await api("/notifications", "GET", { token: ramesh });
  check("worker got payment_success notifications", notifsW.data.notifications.filter((n) => n.type === "payment_success").length >= 1);

  console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error("TEST SCRIPT ERROR:", err.message);
  process.exit(2);
});