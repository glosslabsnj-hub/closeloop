-- Invoices: Business owners invoicing THEIR customers after service completion.
-- Platform-agnostic: works with Stripe Connect, Square, or manual.
-- Mode-aware: service, dispatch, food, medical, general all use invoices differently.

CREATE TYPE invoice_status AS ENUM (
  'draft',        -- Created but not sent
  'sent',         -- Sent to customer
  'viewed',       -- Customer opened the link
  'paid',         -- Payment received
  'partial',      -- Partial payment received
  'overdue',      -- Past due date
  'cancelled',    -- Cancelled by business
  'refunded'      -- Refunded after payment
);

CREATE TYPE invoice_payment_method AS ENUM (
  'stripe_connect',   -- Via Flux's Stripe Connect
  'square',           -- Via business's Square
  'external',         -- Business handles payment outside Flux
  'cash',             -- Marked paid manually (cash/check)
  'integration'       -- Via other connected integration (Jobber, HCP, etc.)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Link to booking/job (optional - invoices can exist standalone)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT,  -- Auto-generated or business-defined
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Customer info (denormalized for invoice record permanence)
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,

  -- Line items stored as JSONB array
  -- Each: { description, quantity, unit_price_cents, total_cents, service_id? }
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Financials (all in cents)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,  -- e.g., 0.0663 for 6.63% NJ sales tax
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  deposit_applied_cents INTEGER NOT NULL DEFAULT 0,  -- Pre-paid deposit from booking
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  balance_due_cents INTEGER NOT NULL DEFAULT 0,

  -- Payment tracking
  payment_method invoice_payment_method,
  stripe_invoice_id TEXT,           -- If paid via Stripe Connect
  stripe_payment_intent_id TEXT,    -- Stripe PI for the payment
  square_invoice_id TEXT,           -- If paid via Square
  external_reference TEXT,          -- For external/integration payments
  payment_url TEXT,                 -- Shareable payment link

  -- Dates
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,                       -- Internal notes (business only)
  customer_memo TEXT,               -- Visible to customer on invoice

  -- Mode-specific metadata
  -- Service: job_type, warranty_info
  -- Dispatch: vehicle_info, mileage, pickup/dropoff
  -- Food: order_number, delivery_fee
  -- Medical: procedure_codes, insurance_info
  -- General: custom fields
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_invoices_lead ON invoices(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due ON invoices(tenant_id, due_at) WHERE status IN ('sent', 'viewed', 'overdue');

-- Auto-generate invoice numbers per tenant
CREATE OR REPLACE FUNCTION fn_generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    SELECT COALESCE(MAX(
      CASE WHEN invoice_number ~ '^\d+$' THEN invoice_number::INTEGER ELSE 0 END
    ), 0) + 1
    INTO next_num
    FROM invoices
    WHERE tenant_id = NEW.tenant_id;

    NEW.invoice_number := LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION fn_generate_invoice_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION fn_invoices_updated_at();

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own invoices"
  ON invoices FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Track invoice status changes for automation triggers
CREATE OR REPLACE FUNCTION fn_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Mark overdue invoices
    IF NEW.status = 'paid' THEN
      NEW.paid_at := COALESCE(NEW.paid_at, now());
      NEW.amount_paid_cents := NEW.total_cents;
      NEW.balance_due_cents := 0;
    END IF;

    -- Could trigger automation-executor here via pg_net in the future
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_status_change
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION fn_invoice_status_change();

-- Add invoice_id to bookings for linking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
