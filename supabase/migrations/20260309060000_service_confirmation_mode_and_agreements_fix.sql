-- ============================================================
-- Per-service confirmation mode + key drop + agreements fixes
-- ============================================================

-- 1. Per-service confirmation mode (mobile = pending, in-shop = auto_confirm)
-- NULL means "use global assistant_settings.ai_booking_mode"
ALTER TABLE services ADD COLUMN IF NOT EXISTS confirmation_mode TEXT;
COMMENT ON COLUMN services.confirmation_mode IS 'Per-service booking confirmation: pending, auto_confirm, or NULL (use global default)';

-- 2. Dropoff instructions at tenant level (key drop policies, etc.)
-- Stored in assistant_settings.settings_json.dropoff_policy already (JSONB),
-- but add a dedicated column for clarity and direct query access
ALTER TABLE assistant_settings ADD COLUMN IF NOT EXISTS dropoff_instructions TEXT;
COMMENT ON COLUMN assistant_settings.dropoff_instructions IS 'Business-wide drop-off/key-drop instructions the AI communicates to callers';

-- 3. Fix service_agreements schema — add columns that UI code expects
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS visits_per_year INTEGER DEFAULT 1;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS visits_used INTEGER DEFAULT 0;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS priority_service BOOLEAN DEFAULT FALSE;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS next_service_date DATE;

-- 4. Add RLS for new columns (inherit existing policies — no new policy needed)
-- The existing RLS on services and assistant_settings already covers all columns.
