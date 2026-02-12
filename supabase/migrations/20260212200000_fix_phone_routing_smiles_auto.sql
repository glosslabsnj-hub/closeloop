-- Fix: Route admin test line calls to Smiles Auto Works instead of Hawks Towing
-- The admin_active_tenant_id was pointing at Hawks Towing (22285205-...)
-- but the user is testing Smiles Auto Works (25e01f26-...).

UPDATE admin_settings
SET admin_active_tenant_id = '25e01f26-ac07-45c3-b6fa-bf0bc64005b4',
    updated_at = now()
WHERE user_id = '1710d7bd-06e2-4701-93ae-ca49a97d1315';

-- Diagnostic: verify phone_numbers → tenant mapping for all tenants
-- Run manually to confirm routing is correct:
--
-- SELECT
--   pn.id AS phone_number_id,
--   pn.phone_number,
--   pn.tenant_id,
--   t.business_name,
--   t.business_mode,
--   pn.is_admin_test_line,
--   pn.status
-- FROM phone_numbers pn
-- JOIN tenants t ON t.id = pn.tenant_id
-- ORDER BY t.business_name;
