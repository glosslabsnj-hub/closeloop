-- ============================================
-- P0 FIX: TENANT ISOLATION FOR PHONE NUMBERS
-- ============================================

-- 1. Add unique constraint on phone_numbers (phone_e164 should be globally unique)
-- A Twilio number should only ever belong to ONE tenant
ALTER TABLE public.phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_phone_e164_key;

ALTER TABLE public.phone_numbers 
ADD CONSTRAINT phone_numbers_phone_e164_unique UNIQUE (phone_e164);

-- 2. Add unique constraint on twilio_sid (should be globally unique)
ALTER TABLE public.phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_twilio_sid_key;

ALTER TABLE public.phone_numbers 
ADD CONSTRAINT phone_numbers_twilio_sid_unique UNIQUE (twilio_sid);

-- 3. Add composite unique constraint for tenant + location (one number per location per tenant)
CREATE UNIQUE INDEX IF NOT EXISTS phone_numbers_tenant_location_purpose_idx 
ON public.phone_numbers (tenant_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid), purpose);

-- 4. Verify assistant_settings has unique tenant_id (should already exist, but ensure)
ALTER TABLE public.assistant_settings 
DROP CONSTRAINT IF EXISTS assistant_settings_tenant_id_key;

ALTER TABLE public.assistant_settings 
ADD CONSTRAINT assistant_settings_tenant_id_unique UNIQUE (tenant_id);

-- 5. Create RLS policies for phone_numbers if not exists
-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with proper tenant isolation
DROP POLICY IF EXISTS "Users can view own tenant phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can insert own tenant phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update own tenant phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Service role has full access to phone_numbers" ON public.phone_numbers;

-- SELECT: Users can only see their own tenant's phone numbers
CREATE POLICY "Users can view own tenant phone numbers" 
ON public.phone_numbers 
FOR SELECT 
USING (public.has_tenant_access(auth.uid(), tenant_id));

-- INSERT: Users can only insert for their own tenant
CREATE POLICY "Users can insert own tenant phone numbers" 
ON public.phone_numbers 
FOR INSERT 
WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- UPDATE: Users can only update their own tenant's phone numbers
CREATE POLICY "Users can update own tenant phone numbers" 
ON public.phone_numbers 
FOR UPDATE 
USING (public.has_tenant_access(auth.uid(), tenant_id));

-- DELETE: Users can only delete their own tenant's phone numbers
CREATE POLICY "Users can delete own tenant phone numbers" 
ON public.phone_numbers 
FOR DELETE 
USING (public.has_tenant_access(auth.uid(), tenant_id));

-- 6. Create index for fast tenant lookup
CREATE INDEX IF NOT EXISTS phone_numbers_tenant_id_idx ON public.phone_numbers (tenant_id);
CREATE INDEX IF NOT EXISTS phone_numbers_phone_e164_idx ON public.phone_numbers (phone_e164);

-- 7. Add comment explaining the constraint
COMMENT ON CONSTRAINT phone_numbers_phone_e164_unique ON public.phone_numbers 
IS 'Each Twilio phone number must belong to exactly one tenant - no sharing allowed';

-- 8. Clean up any duplicate closeloop_numbers in assistant_settings that don't match phone_numbers
-- This fixes the bug where the same number was written to multiple tenants
-- First, log the affected rows for debugging
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM assistant_settings ass
  WHERE ass.closeloop_number IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM phone_numbers pn 
      WHERE pn.phone_e164 = ass.closeloop_number 
        AND pn.tenant_id = ass.tenant_id
    );
  
  RAISE NOTICE 'Found % assistant_settings rows with mismatched phone numbers', affected_count;
END $$;

-- Clear the mismatched closeloop_numbers (they belong to other tenants)
UPDATE assistant_settings 
SET 
  closeloop_number = NULL,
  twilio_phone_sid = NULL,
  connect_status = NULL,
  phone_connected = false
WHERE closeloop_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM phone_numbers pn 
    WHERE pn.phone_e164 = assistant_settings.closeloop_number 
      AND pn.tenant_id = assistant_settings.tenant_id
  );