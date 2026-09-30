-- 006_forecast.sql
-- Week 7: AI demand-forecasting dataset pipeline.
-- forecast_daily : materialized per (zone, service category, service date) request counts
--                  (ingested in real time on booking creation, rebuildable from bookings).
-- forecast_runs  : audit/log of pipeline rebuilds and validation evaluations.

CREATE TABLE IF NOT EXISTS forecast_daily (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone               text NOT NULL,
    service_category   text NOT NULL,
    service_date       date NOT NULL,
    requests           integer NOT NULL DEFAULT 0,
    emergency_requests integer NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (zone, service_category, service_date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_daily_date ON forecast_daily (service_date);
CREATE INDEX IF NOT EXISTS idx_forecast_daily_zone ON forecast_daily (zone, service_category, service_date);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type   text NOT NULL CHECK (run_type IN ('rebuild', 'validation')),
    actor_id   uuid REFERENCES users(id) ON DELETE SET NULL,
    zone       text,
    summary    jsonb,
    metrics    jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_runs_type ON forecast_runs (run_type, created_at DESC);