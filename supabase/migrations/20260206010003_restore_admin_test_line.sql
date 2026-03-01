-- Restore the admin test line phone number (+18553297357)
--
-- The P0-1 migration deleted the demo tenant, which cascade-deleted
-- this phone number from phone_numbers. We need to re-insert it.
--
-- The phone_numbers table requires a tenant_id (NOT NULL FK).
-- For an admin test line, the actual routing comes from
-- admin_settings.admin_active_tenant_id, so the tenant_id here
-- is just the "owner" of the phone number record.
-- We'll use the admin's currently active tenant, or any existing tenant.

DO $$
DECLARE
  v_owner_tenant_id UUID;
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM phone_numbers WHERE phone_e164 = '+18553297357') THEN
    -- Just make sure it's flagged as admin test line
    UPDATE phone_numbers SET
      is_admin_test_line = true
    WHERE phone_e164 = '+18553297357';
    RAISE NOTICE 'Phone number already exists, ensured admin test line flag is set';
    RETURN;
  END IF;

  -- Find a tenant to own this phone number:
  -- Priority 1: The admin's currently active tenant
  SELECT admin_active_tenant_id INTO v_owner_tenant_id
  FROM admin_settings
  WHERE admin_active_tenant_id IS NOT NULL
  LIMIT 1;

  -- Priority 2: Any tenant the user owns
  IF v_owner_tenant_id IS NULL THEN
    SELECT t.id INTO v_owner_tenant_id
    FROM tenants t
    INNER JOIN tenant_users tu ON tu.tenant_id = t.id AND tu.role = 'owner'
    LIMIT 1;
  END IF;

  -- Priority 3: Any tenant at all
  IF v_owner_tenant_id IS NULL THEN
    SELECT id INTO v_owner_tenant_id FROM tenants LIMIT 1;
  END IF;

  IF v_owner_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenants exist - skipping admin test line creation (will be created when first tenant onboards)';
    RETURN;
  END IF;

  -- Insert the admin test line
  INSERT INTO phone_numbers (
    tenant_id,
    phone_e164,
    purpose,
    status,
    is_admin_test_line,
    fallback_tenant_id
  ) VALUES (
    v_owner_tenant_id,
    '+18553297357',
    'forwarding',
    'provisioned',
    true,
    v_owner_tenant_id  -- fallback to same tenant if admin_settings lookup fails
  );

  RAISE NOTICE 'Restored admin test line +18553297357, owner tenant: %', v_owner_tenant_id;
END $$;
