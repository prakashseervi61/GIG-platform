-- 001_tables.sql
-- Cooperative Gig Services Platform - core schema (PRD section 11)

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    phone         text UNIQUE,
    email         text UNIQUE,
    password_hash text NOT NULL,
    role          text NOT NULL CHECK (role IN ('customer', 'worker', 'coop_admin', 'federation_admin')),
    language      text NOT NULL DEFAULT 'en',
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- cooperatives
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cooperatives (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name               text NOT NULL,
    registration_number text UNIQUE,
    location           text,
    latitude           double precision,
    longitude          double precision,
    contact            text,
    status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- workers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workers (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cooperative_id     uuid REFERENCES cooperatives(id) ON DELETE SET NULL,
    experience_years   integer NOT NULL DEFAULT 0,
    verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_at        timestamptz,
    verified_by        uuid REFERENCES users(id) ON DELETE SET NULL,
    latitude           double precision,
    longitude          double precision,
    location           geography(Point, 4326) GENERATED ALWAYS AS (
                           CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                                THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                                ELSE NULL END
                       ) STORED,
    is_available       boolean NOT NULL DEFAULT true,
    rating             numeric(3, 2) NOT NULL DEFAULT 0,
    rating_count       integer NOT NULL DEFAULT 0,
    reliability        numeric(3, 2) NOT NULL DEFAULT 0,
    hourly_rate        numeric(10, 2) NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    category    text NOT NULL,
    description text
);

-- ---------------------------------------------------------------------------
-- certifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id           uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    issuer              text NOT NULL,
    certificate_number  text,
    issue_date          date,
    validity            date,
    verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    document_url        text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- worker_skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_skills (
    worker_id        uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    skill_id         uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    experience_level integer NOT NULL DEFAULT 1,
    certificate_id   uuid REFERENCES certifications(id) ON DELETE SET NULL,
    PRIMARY KEY (worker_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    category            text NOT NULL,
    description         text,
    base_price          numeric(10, 2) NOT NULL DEFAULT 0,
    emergency_available boolean NOT NULL DEFAULT false,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- services <-> skills mapping (used by matching engine: filter by required skill)
CREATE TABLE IF NOT EXISTS service_skills (
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    skill_id   uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number   text UNIQUE,
    customer_id      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_id        uuid REFERENCES workers(id) ON DELETE SET NULL,
    service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    cooperative_id   uuid REFERENCES cooperatives(id) ON DELETE SET NULL,
    scheduled_start  timestamptz NOT NULL,
    scheduled_end    timestamptz,
    address          text,
    latitude         double precision,
    longitude        double precision,
    location         geography(Point, 4326) GENERATED ALWAYS AS (
                         CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                              THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                              ELSE NULL END
                     ) STORED,
    status           text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected')),
    priority         text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'emergency')),
    price            numeric(10, 2) NOT NULL DEFAULT 0,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_id      uuid REFERENCES workers(id) ON DELETE SET NULL,
    amount         numeric(10, 2) NOT NULL,
    currency       text NOT NULL DEFAULT 'INR',
    method         text,
    transaction_id text,
    status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_id   uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- worker_welfare
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_welfare (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    insurance_type  text,
    policy_number   text,
    provider        text,
    coverage_notes  text,
    expiry          date,
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       text NOT NULL,
    title      text NOT NULL,
    body       text,
    data       jsonb,
    is_read    boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);