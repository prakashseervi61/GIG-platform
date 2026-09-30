# SIH Demo Runbook — CoopGig

Target: a 10–12 minute walkthrough covering customer → worker → admin, ending on the
AI demand-forecasting pipeline. Everything runs locally via Docker Compose.

## 0. Prep (before judges arrive)

```bash
docker compose up --build          # ~2-3 min first time
docker compose run --rm backend node dist/seed/demo.js
```

Then open three tabs (or one per screen if you have displays):

- Customer — http://localhost:8080
- Worker — http://localhost:8081
- Admin — http://localhost:8082

Sanity check: API `http://localhost:4000/api/health` returns `{"status":"ok"}`.

`db:demo` gives the admin screens ~90 days of history: **675 bookings, 576 completed,
₹3.58L transaction value, 4.79 avg rating, 309 forecast_daily rows**. Re-run it any time
before a demo to top the numbers back up (it is idempotent).

> Between rehearsal runs, `docker compose run --rm backend node dist/seed/demo.js`
> restores a clean, impressive dataset in seconds.

## 1. Customer books a service (~3 min)

| Step | Action | Talking point |
| ---- | ------ | ------------- |
| 1 | Login `9876500001` / `customer@123` | Phone-based login for low-literacy users |
| 2 | Home → pick **Plumbing** | Category-first discovery |
| 3 | Open the service → **Find workers** | Ranked by distance, rating, price |
| 4 | Pick a worker → choose a slot → **Book** (normal) | Cooperative worker allocation |

Booking detail shows status **Requested**.

## 2. Worker fulfils the job (~2 min)

| Step | Action | Talking point |
| ---- | ------ | ------------- |
| 1 | Login `9876500002` / `worker@123` | Ramesh (Plumber) |
| 2 | Toggle **Available** if needed → open the job | Jobs come from the same cooperative pool |
| 3 | **Accept** → **Start** → **Complete** | Lifecycle enforced server-side (customers cannot force a completion) |

## 3. Customer pays & rates (~2 min)

| Step | Action | Talking point |
| ---- | ------ | ------------- |
| 1 | Customer tab → open booking → **Pay** | Sandbox UPI order → verification |
| 2 | Invoice appears (18% tax, emergency surcharge shown) | Invoice issued on verified payment |
| 3 | **Rate** the worker | One rating per booking; duplicates rejected (409) |

Optional: open the worker tab → earnings and reliability already updated.

## 4. Emergency flow (~1 min, optional)

Book a service that supports emergency (e.g. *Emergency Plumbing* / *Emergency Electrical
Repair*) with priority **Emergency** → surcharge is applied and the request is prioritised in
matching. (If the service has no emergency flag, the client simply does not offer it.)

## 5. Cooperative admin (~2 min) — `coimbatore.admin@coop.example` / `admin@12345`

- **Dashboard** — total/verified workers, active/completed bookings, emergency count,
  transaction value, average rating.
- **Analytics** — bookings by status/day/category/service, revenue trend, top workers.
- **Workers** — verification queue; approve a pending worker.
- **Certifications** — approve/reject a worker certificate.

## 6. AI demand forecast (~2 min) — `federation@coop.example` / `admin@12345`

- **Forecast** — 7/14 day demand per zone and category, with High/Medium/Low labels and
  confidence. Filter by zone/category.
- **Workforce** — recommended crew per zone/day plus gap and a plain-language recommendation
  ("Schedule 1 additional Electrical worker in … to close the demand gap").
- **Validation** — MAE / MAPE / bias against history, overall and per category.
- **Rebuild dataset** — regenerates `forecast_daily` from booking history (federation only).

Close by noting the pipeline ingests every new booking in real time (`forecast_daily` is
updated on booking creation) and the model is a weekday-seasonal naive forecast with trend.

## Fallbacks

- **Slot conflict while booking** — pick a slot further out; seed availability windows can
  already hold bookings.
- **Docker unavailable** — run backend (`npm run dev`) + clients (`npm run dev`) locally and
  use ports 5173/5174/5175 instead of 8080/8081/8082.
- **Forgot to seed demo history** — admin screens still work; numbers are just smaller. Seed and
  refresh the page.
- **Full reset** — `npm run db:reset` (base seed) then optionally `npm run db:demo`.
