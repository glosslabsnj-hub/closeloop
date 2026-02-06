-- Create admin test tenants for each business mode
--
-- Ensures:
-- 1. One test tenant per business mode (service, dispatch, food, medical, general)
-- 2. Each has an active subscription
-- 3. The super admin user is linked to all via tenant_users
-- 4. The admin test line (+18553297357) exists and routes to admin's active tenant

DO $$
DECLARE
  v_admin_user_id UUID;
  v_tenant_id UUID;
  v_mode TEXT;
  v_name TEXT;
  v_industry TEXT;
  v_modules JSONB;
  v_existing_tenant_id UUID;
BEGIN
  -- =========================================================================
  -- Step 1: Find the super admin user
  -- =========================================================================
  SELECT user_id INTO v_admin_user_id
  FROM user_roles
  WHERE role = 'super_admin'
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    RAISE NOTICE 'No super_admin user found - skipping test tenant setup';
    RETURN;
  END IF;

  RAISE NOTICE 'Found super admin user: %', v_admin_user_id;

  -- =========================================================================
  -- Step 2: Create test tenants for each business mode
  -- =========================================================================

  -- Define tenants to create: mode, name, industry, modules
  FOR v_mode, v_name, v_industry, v_modules IN
    VALUES
      ('service',  'Test - Service Co',    'home_services',  '["ai_voice","instant_text_back","booking"]'::JSONB),
      ('dispatch', 'Test - Dispatch Co',   'towing',         '["ai_voice","instant_text_back","dispatch_queue"]'::JSONB),
      ('food',     'Test - Restaurant',    'restaurant',     '["ai_voice","instant_text_back","food_orders","menu_knowledge","reservations","catering"]'::JSONB),
      ('medical',  'Test - Medical Office', 'medical',       '["ai_voice","instant_text_back","booking","medical_intake"]'::JSONB),
      ('general',  'Test - General Biz',   'general',        '["ai_voice","instant_text_back"]'::JSONB)
  LOOP
    -- Check if admin already has a tenant with this business_mode
    SELECT t.id INTO v_existing_tenant_id
    FROM tenants t
    INNER JOIN tenant_users tu ON tu.tenant_id = t.id
    WHERE tu.user_id = v_admin_user_id
      AND t.business_mode = v_mode::business_mode
    LIMIT 1;

    IF v_existing_tenant_id IS NOT NULL THEN
      -- Tenant exists - just ensure it has a subscription
      RAISE NOTICE 'Tenant for mode % already exists: %', v_mode, v_existing_tenant_id;
      v_tenant_id := v_existing_tenant_id;

      -- Ensure subscription exists and is active
      INSERT INTO subscriptions (tenant_id, plan_code, status, included_minutes, current_period_end)
      VALUES (v_tenant_id, 'base-200', 'active', 200, NOW() + INTERVAL '1 year')
      ON CONFLICT (tenant_id) DO UPDATE SET
        status = 'active',
        current_period_end = GREATEST(subscriptions.current_period_end, NOW() + INTERVAL '1 year');

    ELSE
      -- Create new tenant
      INSERT INTO tenants (
        name,
        business_mode,
        industry,
        enabled_modules,
        timezone,
        ai_enabled,
        hipaa_mode,
        onboarding_completed_at
      ) VALUES (
        v_name,
        v_mode::business_mode,
        v_industry,
        v_modules,
        'America/New_York',
        true,
        (v_mode = 'medical'),  -- HIPAA only for medical
        NOW()                  -- Mark as onboarded so it doesn't redirect
      )
      RETURNING id INTO v_tenant_id;

      RAISE NOTICE 'Created tenant % for mode %: %', v_name, v_mode, v_tenant_id;

      -- Link admin user to this tenant
      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (v_tenant_id, v_admin_user_id, 'owner')
      ON CONFLICT (tenant_id, user_id) DO NOTHING;

      -- Create active subscription
      INSERT INTO subscriptions (tenant_id, plan_code, status, included_minutes, current_period_end)
      VALUES (v_tenant_id, 'base-200', 'active', 200, NOW() + INTERVAL '1 year')
      ON CONFLICT (tenant_id) DO UPDATE SET
        status = 'active',
        current_period_end = GREATEST(subscriptions.current_period_end, NOW() + INTERVAL '1 year');
    END IF;
  END LOOP;

  -- =========================================================================
  -- Step 3: Ensure admin test line exists
  -- =========================================================================

  -- Set admin_active_tenant_id to the service tenant if not already set
  IF NOT EXISTS (
    SELECT 1 FROM admin_settings
    WHERE user_id = v_admin_user_id
      AND admin_active_tenant_id IS NOT NULL
  ) THEN
    -- Default to the service tenant
    SELECT t.id INTO v_tenant_id
    FROM tenants t
    INNER JOIN tenant_users tu ON tu.tenant_id = t.id
    WHERE tu.user_id = v_admin_user_id
      AND t.business_mode = 'service'
    LIMIT 1;

    INSERT INTO admin_settings (user_id, admin_active_tenant_id, updated_at)
    VALUES (v_admin_user_id, v_tenant_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      admin_active_tenant_id = COALESCE(admin_settings.admin_active_tenant_id, v_tenant_id),
      updated_at = NOW();

    RAISE NOTICE 'Set default admin_active_tenant_id to service tenant: %', v_tenant_id;
  END IF;

  -- Ensure the admin test line phone number exists
  IF NOT EXISTS (SELECT 1 FROM phone_numbers WHERE phone_e164 = '+18553297357') THEN
    -- Use the admin's active tenant as owner
    SELECT admin_active_tenant_id INTO v_tenant_id
    FROM admin_settings
    WHERE user_id = v_admin_user_id;

    INSERT INTO phone_numbers (tenant_id, phone_e164, purpose, status, is_admin_test_line, fallback_tenant_id)
    VALUES (v_tenant_id, '+18553297357', 'forwarding', 'provisioned', true, v_tenant_id);

    RAISE NOTICE 'Created admin test line +18553297357';
  ELSE
    -- Ensure it's flagged as admin test line
    UPDATE phone_numbers SET is_admin_test_line = true
    WHERE phone_e164 = '+18553297357' AND (is_admin_test_line IS NULL OR is_admin_test_line = false);
  END IF;

  RAISE NOTICE 'Admin test tenant setup complete!';
END $$;
