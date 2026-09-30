-- 005_payments_invoices.sql
-- Week 5: payment sandbox (order lifecycle) + invoices + transaction history + audit log.

-- Extend payments with a human reference, sandbox provider order id and paid_at.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_number text UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'sandbox' CHECK (provider IN ('sandbox'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      text UNIQUE NOT NULL,
    payment_id          uuid NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
    booking_id          uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_id           uuid REFERENCES workers(id) ON DELETE SET NULL,
    cooperative_id      uuid REFERENCES cooperatives(id) ON DELETE SET NULL,
    service_name        text NOT NULL,
    customer_name       text NOT NULL,
    worker_name         text,
    subtotal            numeric(10, 2) NOT NULL,
    emergency_surcharge numeric(10, 2) NOT NULL DEFAULT 0,
    tax_rate            numeric(5, 2) NOT NULL DEFAULT 0,
    tax_amount          numeric(10, 2) NOT NULL DEFAULT 0,
    total               numeric(10, 2) NOT NULL,
    currency            text NOT NULL DEFAULT 'INR',
    status              text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
    issued_at           timestamptz NOT NULL DEFAULT now(),
    paid_at             timestamptz,
    due_date            date,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_cooperative_id ON invoices (cooperative_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- payment_logs (security audit trail: create / verify / replay attempts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id     uuid REFERENCES payments(id) ON DELETE SET NULL,
    event          text NOT NULL,
    actor_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    detail         jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id ON payment_logs (payment_id, created_at DESC);