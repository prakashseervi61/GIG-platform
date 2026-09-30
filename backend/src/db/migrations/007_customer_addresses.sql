-- 007_customer_addresses.sql
-- Multiple saved addresses per customer (Home / Work / Office etc.) with one default.

CREATE TABLE IF NOT EXISTS customer_addresses (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      text NOT NULL,
    address    text NOT NULL,
    latitude   double precision,
    longitude  double precision,
    location   geography(Point, 4326) GENERATED ALWAYS AS (
                   CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                        ELSE NULL END
               ) STORED,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_gist ON customer_addresses USING gist (location);

-- at most one default address per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_addresses_one_default
    ON customer_addresses (user_id) WHERE is_default;
