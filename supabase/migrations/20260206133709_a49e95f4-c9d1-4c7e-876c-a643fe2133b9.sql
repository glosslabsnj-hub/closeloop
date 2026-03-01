-- Restore the admin test line phone number (+18553297357)
-- Using purpose='admin_test' to avoid unique constraint on (tenant_id, location_id, purpose)

DO $$
DECLARE
  v_owner_tenant_id UUID;
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM phone_numbers WHERE phone_e164 = '+18553297357') THEN
    UPDATE phone_numbers SET
      is_admin_test_line = true
    WHERE phone_e164 = '+18553297357';
    RAISE NOTICE 'Phone number already exists, ensured admin test line flag is set';
    RETURN;
  END IF;

  -- Find a tenant to own this phone number
  SELECT admin_active_tenant_id INTO v_owner_tenant_id
  FROM admin_settings
  WHERE admin_active_tenant_id IS NOT NULL
  LIMIT 1;

  IF v_owner_tenant_id IS NULL THEN
    SELECT id INTO v_owner_tenant_id FROM tenants LIMIT 1;
  END IF;

  IF v_owner_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenants exist - skipping phone number creation';
    RETURN;
  END IF;

  -- Insert the admin test line with purpose='admin_test' to avoid unique constraint
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
    'admin_test',
    'provisioned',
    true,
    v_owner_tenant_id
  );

  RAISE NOTICE 'Restored admin test line +18553297357, owner tenant: %', v_owner_tenant_id;
END $$;