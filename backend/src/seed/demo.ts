import { pool } from "../db/pool";
import { rebuildForecastDataset } from "../models/forecast.model";

// Seeds ~90 days of historical demand so forecast/analytics/earnings screens
// look realistic in the SIH demo. Idempotent: wipes transactional data first,
// so run `npm run db:seed` (or db:reset) before/after freely.

const DAYS = Number(process.env.DEMO_DAYS ?? 90);
const SEED = Number(process.env.DEMO_SEED ?? 20260217);

const TRANSACTIONAL_TABLES = [
  "customer_locations",
  "invoices",
  "payment_logs",
  "payments",
  "ratings",
  "notifications",
  "bookings",
  "worker_welfare",
  "verification_log",
  "forecast_runs",
  "forecast_daily",
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);
const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

function poissonish(lambda: number): number {
  // simple bounded approximation, good enough for demo volume
  let count = 0;
  const cap = Math.max(6, Math.ceil(lambda * 3));
  for (let i = 0; i < cap; i += 1) if (rng() < lambda / cap) count += 1;
  return count;
}

async function demo(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE ${TRANSACTIONAL_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
    await client.query("UPDATE workers SET rating = 0, rating_count = 0, is_available = TRUE");

    const { rows: services } = await client.query<{
      id: string;
      name: string;
      category: string;
      base_price: string;
      emergency_available: boolean;
    }>("SELECT id, name, category, base_price, emergency_available FROM services ORDER BY category");

    const { rows: workers } = await client.query<{
      id: string;
      cooperative_id: string | null;
      name: string;
      hourly_rate: string;
    }>(`SELECT w.id, w.cooperative_id, w.hourly_rate, u.name
          FROM workers w JOIN users u ON u.id = w.user_id`);

    const { rows: workerSkills } = await client.query<{ worker_id: string; category: string }>(
      `SELECT ws.worker_id, s.category
         FROM worker_skills ws JOIN skills s ON s.id = ws.skill_id`
    );
    const { rows: customers } = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE role = 'customer' ORDER BY created_at ASC"
    );

    if (services.length === 0 || workers.length === 0 || customers.length === 0) {
      throw new Error("Base seed missing — run `npm run db:seed` first.");
    }

    const categoriesByWorker = new Map<string, Set<string>>();
    for (const row of workerSkills) {
      const set = categoriesByWorker.get(row.worker_id) ?? new Set<string>();
      set.add(row.category);
      categoriesByWorker.set(row.worker_id, set);
    }

    const workersForCategory = (category: string) =>
      workers.filter((w) => categoriesByWorker.get(w.id)?.has(category));

    const servicesByCategory = new Map<string, typeof services>();
    for (const service of services) {
      const list = servicesByCategory.get(service.category) ?? [];
      list.push(service);
      servicesByCategory.set(service.category, list);
    }

    // seasonality: weekday boost for plumbing/electrical, weekend boost for cleaning
    const demandFor = (category: string, weekday: number): number => {
      const weekend = weekday === 0 || weekday === 6;
      if (category === "Cleaning") return weekend ? 3.2 : 1.1;
      if (category === "Plumbing") return weekend ? 1.4 : 2.4;
      if (category === "Electrical") return weekend ? 1.2 : 2.0;
      return weekend ? 1.6 : 1.5;
    };

    let bookings = 0;
    let completed = 0;
    let payments = 0;
    let invoices = 0;
    let ratings = 0;
    let paymentSeq = 1;
    let invoiceSeq = 1;

    const today = new Date();
    for (let dayOffset = DAYS; dayOffset >= 0; dayOffset -= 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - dayOffset);

      const trend = 0.75 + 0.5 * ((DAYS - dayOffset) / DAYS); // gentle growth
      for (const [category, categoryServices] of servicesByCategory) {
        const eligible = workersForCategory(category);
        if (eligible.length === 0) continue;

        const lambda = demandFor(category, day.getDay()) * trend;
        const requestCount = poissonish(lambda);

        for (let i = 0; i < requestCount; i += 1) {
          const service = pick(categoryServices);
          const worker = pick(eligible);
          const priorEmergency = service.emergency_available && rng() < 0.12;
          const emergency = priorEmergency || (service.emergency_available && rng() < 0.18);
          const isEmergency = service.emergency_available ? emergency : false;

          const createdAt = new Date(day);
          createdAt.setHours(8 + Math.floor(rng() * 12), Math.floor(rng() * 60), 0, 0);
          const start = new Date(createdAt.getTime() + (1 + Math.floor(rng() * 3)) * 3600 * 1000);
          const end = new Date(start.getTime() + 2 * 3600 * 1000);

          const isCompleted = rng() < 0.86;
          const status = isCompleted ? "completed" : rng() < 0.6 ? "cancelled" : "rejected";
          const basePrice = Number(service.base_price);
          const surcharge = isEmergency ? round2(basePrice * 0.5) : 0;
          const price = round2(basePrice + surcharge);

          const bookingNumber = `GIG-${createdAt.toISOString().slice(2, 10).replace(/-/g, "")}-D${String(bookings + 1).padStart(4, "0")}`;
          const { rows: inserted } = await client.query<{ id: string }>(
            `INSERT INTO bookings
               (booking_number, customer_id, worker_id, service_id, cooperative_id,
                scheduled_start, scheduled_end, address, latitude, longitude,
                status, priority, price, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING id`,
            [
              bookingNumber,
              customers[0].id,
              worker.id,
              service.id,
              worker.cooperative_id,
              start.toISOString(),
              end.toISOString(),
              "Demo Lane, Coimbatore",
              11.0168,
              76.9558,
              status,
              isEmergency ? "emergency" : "normal",
              price,
              createdAt.toISOString(),
              createdAt.toISOString()
            ]
          );
          bookings += 1;
          const bookingId = inserted[0].id;

          if (!isCompleted) continue;
          completed += 1;

          const paidAt = new Date(end.getTime() + 30 * 60 * 1000);
          const paymentNumber = `PAY-DEMO-${String(paymentSeq).padStart(5, "0")}`;
          paymentSeq += 1;
          const { rows: paymentRows } = await client.query<{ id: string }>(
            `INSERT INTO payments
               (booking_id, customer_id, worker_id, amount, currency, method,
                transaction_id, status, payment_number, provider, provider_order_id,
                paid_at, created_at, updated_at)
             VALUES ($1,$2,$3,$4,'INR',$5,$6,'completed',$7,'sandbox',$8,$9,$10,$11)
             RETURNING id`,
            [
              bookingId,
              customers[0].id,
              worker.id,
              price,
              rng() < 0.7 ? "upi" : "cash",
              `TXN-DEMO-${String(paymentSeq).padStart(5, "0")}`,
              paymentNumber,
              `order-demo-${paymentSeq}`,
              paidAt.toISOString(),
              createdAt.toISOString(),
              paidAt.toISOString()
            ]
          );
          payments += 1;
          const paymentId = paymentRows[0].id;

          const subtotal = round2(basePrice);
          const taxAmount = round2((subtotal + surcharge) * 0.18);
          const total = round2(subtotal + surcharge + taxAmount);
          const invoiceNumber = `INV-DEMO-${String(invoiceSeq).padStart(5, "0")}`;
          invoiceSeq += 1;
          await client.query(
            `INSERT INTO invoices
               (invoice_number, payment_id, booking_id, customer_id, worker_id, cooperative_id,
                service_name, customer_name, worker_name, subtotal, emergency_surcharge,
                tax_rate, tax_amount, total, status, issued_at, paid_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,18,$12,$13,'paid',$14,$15)`,
            [
              invoiceNumber,
              paymentId,
              bookingId,
              customers[0].id,
              worker.id,
              worker.cooperative_id,
              service.name,
              customers[0].name,
              worker.name,
              subtotal,
              surcharge,
              taxAmount,
              total,
              paidAt.toISOString(),
              paidAt.toISOString()
            ]
          );
          invoices += 1;

          if (rng() < 0.82) {
            const score = rng() < 0.78 ? 5 : 4;
            await client.query(
              `INSERT INTO ratings (booking_id, customer_id, worker_id, rating, comment)
               VALUES ($1,$2,$3,$4,$5)`,
              [bookingId, customers[0].id, worker.id, score, score === 5 ? "Great work" : "Good service"]
            );
            ratings += 1;
          }
        }
      }
    }

    await client.query(
      `UPDATE workers w SET
         rating = COALESCE(agg.avg_rating, 0),
         rating_count = COALESCE(agg.rating_count, 0),
         reliability = LEAST(5, COALESCE(agg.avg_rating, 0) + 0.3)
       FROM (
         SELECT worker_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*)::int AS rating_count
           FROM ratings GROUP BY worker_id
       ) agg
       WHERE agg.worker_id = w.id`
    );

    await client.query(
      `INSERT INTO customer_locations (user_id, label, address, latitude, longitude)
       VALUES ($1, 'Home', 'Demo Lane, Coimbatore', 11.0168, 76.9558)
       ON CONFLICT (user_id) DO UPDATE SET address = EXCLUDED.address`,
      [customers[0].id]
    );

    await client.query("COMMIT");

    const { records } = await rebuildForecastDataset(null);

    console.log("Demo history applied.");
    console.log(`  - window: ${DAYS} days`);
    console.log(`  - bookings: ${bookings} (${completed} completed, payments ${payments})`);
    console.log(`  - invoices: ${invoices}, ratings: ${ratings}`);
    console.log(`  - forecast_daily rows rebuilt: ${records}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

demo()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Demo seed failed:", err);
    await pool.end();
    process.exit(1);
  });