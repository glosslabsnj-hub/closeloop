-- P0-1: Remove hardcoded demo data from production
-- CLAUDE.md: "No hardcoded demo data in product paths"
--
-- The migration 20260128075258 and 20260128075305 inserted demo data
-- for tenant a0000000-0000-0000-0000-000000000001 (jackangelini@icloud.com).
-- This migration cleans it up so production has no seeded test data.

DO $$
DECLARE
  v_demo_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Only delete if the demo tenant exists
  IF EXISTS (SELECT 1 FROM tenants WHERE id = v_demo_tenant_id) THEN
    -- Delete in dependency order (children first)
    DELETE FROM objection_responses WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM business_faqs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM services WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM assistant_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM subscriptions WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenant_users WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenants WHERE id = v_demo_tenant_id;

    RAISE NOTICE 'Removed hardcoded demo tenant a0000000-...';
  ELSE
    RAISE NOTICE 'Demo tenant not found, nothing to clean up';
  END IF;
END $$;
