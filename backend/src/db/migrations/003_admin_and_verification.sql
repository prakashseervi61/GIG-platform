-- 003_admin_and_verification.sql
-- Cooperative admin linkage, verification audit log and certification audit fields

-- Link a cooperative to its admin user (coop_admin)
ALTER TABLE cooperatives ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cooperatives_admin ON cooperatives (admin_user_id);

-- Audit fields for certification verification
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Audit log for administrative verification actions (PRD security: log verification changes)
CREATE TABLE IF NOT EXISTS verification_log (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id    uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    action       text NOT NULL,
    performed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note         text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_worker ON verification_log (worker_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_performed_by ON verification_log (performed_by);