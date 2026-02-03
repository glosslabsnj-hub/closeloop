-- Phase 1A: Add columns to admin_settings for admin phone registration
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS admin_phone_e164 TEXT,
ADD COLUMN IF NOT EXISTS admin_phone_verified BOOLEAN DEFAULT false;

-- Phase 1B: Add columns to phone_numbers for admin test line support
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS is_admin_test_line BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fallback_tenant_id UUID REFERENCES tenants(id);

-- Phase 1C: Mark the test line number
UPDATE phone_numbers 
SET 
  is_admin_test_line = true,
  fallback_tenant_id = 'a0000000-0000-0000-0000-000000000001'
WHERE phone_e164 = '+18553297357';

-- Add index for quick admin phone lookup
CREATE INDEX IF NOT EXISTS idx_admin_settings_phone ON admin_settings(admin_phone_e164) WHERE admin_phone_e164 IS NOT NULL;

-- Add index for admin test line lookup
CREATE INDEX IF NOT EXISTS idx_phone_numbers_admin_test_line ON phone_numbers(is_admin_test_line) WHERE is_admin_test_line = true;