-- 002_indexes.sql
-- Query indexes + spatial indexes for the core schema

-- Spatial indexes (PostGIS)
CREATE INDEX IF NOT EXISTS idx_workers_location ON workers USING gist (location);
CREATE INDEX IF NOT EXISTS idx_bookings_location ON bookings USING gist (location);

-- users
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- workers
CREATE INDEX IF NOT EXISTS idx_workers_cooperative ON workers (cooperative_id);
CREATE INDEX IF NOT EXISTS idx_workers_verification_status ON workers (verification_status);
CREATE INDEX IF NOT EXISTS idx_workers_availability ON workers (is_available) WHERE is_available = true;

-- worker_skills
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill ON worker_skills (skill_id);

-- certifications
CREATE INDEX IF NOT EXISTS idx_certifications_worker ON certifications (worker_id);
CREATE INDEX IF NOT EXISTS idx_certifications_verification ON certifications (verification_status);

-- services
CREATE INDEX IF NOT EXISTS idx_services_category ON services (category);

-- service_skills
CREATE INDEX IF NOT EXISTS idx_service_skills_skill ON service_skills (skill_id);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON bookings (worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON bookings (priority);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings (scheduled_start);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ratings
CREATE INDEX IF NOT EXISTS idx_ratings_worker ON ratings (worker_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);