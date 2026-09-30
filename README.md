# CoopGig — Cooperative Gig Services Platform

SIH Problem Statement 26089. A cooperative-run gig marketplace connecting households with
verified local workers (plumbers, electricians, cleaners, carpenters) across two cooperatives
(Coimbatore and Chennai), with matching, scheduling, payments, ratings, worker verification,
and an AI demand-forecasting pipeline for cooperative admins.

## Stack

| Layer      | Tech                                                                |
| ---------- | ------------------------------------------------------------------- |
| Backend    | Node 22, Express, TypeScript, PostgreSQL + PostGIS, Redis, Zod, JWT |
| Clients    | React 19, TypeScript, Vite, React Router 7, Tailwind v4 (3 apps)     |
| Deployment | Docker Compose (nginx-served SPAs + API container)                  |
| Tests      | API-level integration suites (week2–week8)                          |

## Repository layout

```
backend/            Express API
  src/              routes, controllers, services, models, schemas
  src/seed/         seed.ts (base), demo.ts (90-day history), reset.ts
  tests/e2e/        week2..week8 suites + run-all.mjs
  docker-compose.yml   dev infra only (Postgres 5433/Redis 6379)
client/             npm workspaces: customer/, worker/, admin/
docker-compose.yml  full local stack (Postgres, Redis, API, 3 SPAs)
docs/SIH_DEMO.md    demo runbook
```

## Quick start (Docker — recommended for the demo)

```bash
docker compose up --build
```

| App      | URL                     |
| -------- | ----------------------- |
| Customer | http://localhost:8080   |
| Worker   | http://localhost:8081   |
| Admin    | http://localhost:8082   |
| API      | http://localhost:4000/api |

Migrations and the base seed run automatically on backend start. To add realistic
demand history (90 days of completed bookings, payments, invoices, ratings):

```bash
docker compose run --rm backend node dist/seed/demo.js   # or: npm run db:demo
```

## Local development

```bash
# 1. infra (Postgres on 5433, Redis on 6379)
docker compose up -d postgres redis        # from backend/

# 2. backend
cd backend && npm install
cp .env.example .env
npm run db:init                            # migrate + seed
npm run dev                                # http://localhost:4000

# 3. clients (customer 5173, worker 5174, admin 5175; /api proxied to :4000)
cd client && npm install
npm run dev
```

## Demo credentials

| Role                  | Identifier                        | Password      |
| --------------------- | --------------------------------- | ------------- |
| Customer              | `9876500001`                      | `customer@123` |
| Worker (Plumber)      | `9876500002`                      | `worker@123`  |
| Worker (Electrician)  | `9876500003`                      | `worker@123`  |
| Worker (Carpenter)    | `9876500011`                      | `worker@123`  |
| Worker (Cleaner)      | `9876500012`                      | `worker@123`  |
| Coimbatore coop admin | `coimbatore.admin@coop.example`   | `admin@12345` |
| Chennai coop admin    | `chennai.admin@coop.example`      | `admin@12345` |
| Federation admin      | `federation@coop.example`         | `admin@12345` |

## Database helpers

```bash
npm run db:init      # migrations + base seed (idempotent)
npm run db:seed      # base seed only
npm run db:reset     # wipe transactional data, restore base seed
npm run db:demo      # 90-day history + rebuilt forecast dataset
```

## Tests

Suites are stateful (they assert counts and transitions), so reset first:

```bash
cd backend
npm run db:reset
npm test             # week8 full user journey
npm run test:all     # week2 -> week8 in order
```

Set `DEMO_DAYS` to change the demo window (e.g. `DEMO_DAYS=120 npm run db:demo`).

## Feature coverage

- **Customer**: service discovery by category, ranked worker search (distance/rating/price),
  booking with normal/emergency priority, live status tracking, sandbox payment + invoice,
  ratings, notifications, saved location.
- **Worker**: onboarding + skill certification, availability toggle, job inbox,
  accept → start → complete lifecycle, earnings and reliability score.
- **Admin**: cooperative dashboard KPIs, analytics breakdowns, worker verification queue,
  certification approval, AI demand forecast + workforce allocation plan, forecast validation
  metrics, federation-wide dataset rebuild.
