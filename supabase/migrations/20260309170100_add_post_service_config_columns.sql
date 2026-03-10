-- Add post-service automation config columns to all workflow config tables.
-- Each business mode can control: auto-invoice, auto-review, invoice terms, tax rate.
-- Business owners can opt in/out per mode.

-- SERVICE MODE (HVAC, plumbing, electrical, GC)
ALTER TABLE service_workflow_config
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_service_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_completion_confirmation BOOLEAN DEFAULT false;

COMMENT ON COLUMN service_workflow_config.auto_invoice IS 'Automatically generate invoice when booking marked complete';
COMMENT ON COLUMN service_workflow_config.require_completion_confirmation IS 'Require owner to confirm completion before triggering post-service chain';

-- DISPATCH MODE (towing, roadside, courier)
ALTER TABLE dispatch_workflow_config
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 0,  -- Due immediately for towing
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_service_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_completion_confirmation BOOLEAN DEFAULT false;

-- FOOD MODE (restaurant, catering)
ALTER TABLE food_workflow_config
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT false,  -- Usually pre-paid
  ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_service_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_completion_confirmation BOOLEAN DEFAULT false;

-- MEDICAL MODE (healthcare)
ALTER TABLE medical_workflow_config
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT false,  -- Complex billing
  ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_service_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_completion_confirmation BOOLEAN DEFAULT true;  -- Medical needs confirmation

-- GENERAL MODE (general/sales)
ALTER TABLE general_workflow_config
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_service_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_completion_confirmation BOOLEAN DEFAULT false;

-- Add completed_at to bookings if not exists
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
