-- 004_customer_locations.sql
-- Customer service addresses (Week 3: discovery / location capture)

CREATE TABLE IF NOT EXISTS customer_locations (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    label      text,
    address    text NOT NULL,
    latitude   double precision,
    longitude  double precision,
    location   geography(Point, 4326) GENERATED ALWAYS AS (
                   CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                        ELSE NULL END
               ) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_locations_user ON customer_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_locations_gist ON customer_locations USING gist (location);