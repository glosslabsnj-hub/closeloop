-- Combined P0 migrations: Remove demo data, fix race condition, enforce NOT NULL
-- This properly handles all FK dependencies

DO $$
DECLARE
  v_demo_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM tenants WHERE id = v_demo_tenant_id) THEN
    -- Delete in proper dependency order (all child tables first)
    DELETE FROM twilio_event_logs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM ai_event_logs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM ai_context_snapshots WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM ai_call_sessions WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM delivery_attempts WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM automation_run_steps WHERE run_id IN (SELECT id FROM automation_runs WHERE tenant_id = v_demo_tenant_id);
    DELETE FROM automation_runs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM bookings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM busy_blocks WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM dispatch_jobs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM food_orders WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM reservations WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM catering_requests WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM opportunities WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM conversations WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM messages WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM customer_equipment WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM customer_merge_queue WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM customers WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM leads WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM objection_responses WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM business_faqs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM business_memory WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM business_intent_rules WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM ai_knowledge_base WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM services WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM availability_slots WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM blocked_times WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM calendar_connections WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM calendar_tokens WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM integrations WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM automation_rules WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM automations WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM delivery_rules WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM workflows WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM booking_delivery_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM dispatch_delivery_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM data_retention_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM phone_numbers WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM ai_assistants WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM assistant_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenant_distance_settings WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenant_locations WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM subscriptions WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenant_users WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM confirmation_receipts WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM audit_events WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM audit_logs WHERE tenant_id = v_demo_tenant_id;
    DELETE FROM tenants WHERE id = v_demo_tenant_id;

    RAISE NOTICE 'Removed hardcoded demo tenant and all related data';
  ELSE
    RAISE NOTICE 'Demo tenant not found, nothing to clean up';
  END IF;
END $$;

-- P0-3: Fix race condition in resolve_customer()
CREATE OR REPLACE FUNCTION public.resolve_customer(
  _tenant_id UUID,
  _phone TEXT,
  _name TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _source TEXT DEFAULT 'manual'
)
RETURNS TABLE(
  customer_id UUID,
  is_new BOOLEAN,
  has_conflict BOOLEAN,
  conflict_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_e164 TEXT;
  v_existing_customer RECORD;
  v_customer_id UUID;
  v_is_new BOOLEAN := false;
  v_has_conflict BOOLEAN := false;
  v_conflict_id UUID;
  v_conflict_type TEXT;
BEGIN
  v_phone_e164 := normalize_phone_e164(_phone);

  IF v_phone_e164 IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  INSERT INTO customers (tenant_id, phone_e164, phone_raw, full_name, email, source)
  VALUES (_tenant_id, v_phone_e164, _phone, COALESCE(_name, 'Unknown'), _email, _source)
  ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
    email = COALESCE(customers.email, EXCLUDED.email),
    updated_at = now()
  RETURNING id, (xmax = 0) AS was_inserted INTO v_customer_id, v_is_new;

  IF NOT v_is_new THEN
    SELECT * INTO v_existing_customer FROM customers c WHERE c.id = v_customer_id;

    IF _name IS NOT NULL AND _name != '' AND v_existing_customer.full_name IS DISTINCT FROM _name AND v_existing_customer.full_name != 'Unknown' THEN
      v_has_conflict := true;
      v_conflict_type := 'name_mismatch';
    END IF;

    IF _email IS NOT NULL AND _email != '' AND v_existing_customer.email IS NOT NULL AND v_existing_customer.email != _email THEN
      IF v_has_conflict THEN
        v_conflict_type := 'both_mismatch';
      ELSE
        v_has_conflict := true;
        v_conflict_type := 'email_mismatch';
      END IF;
    END IF;

    IF v_has_conflict THEN
      INSERT INTO customer_merge_queue (tenant_id, existing_customer_id, incoming_phone_e164, incoming_name, incoming_email, conflict_type, source)
      VALUES (_tenant_id, v_customer_id, v_phone_e164, _name, _email, v_conflict_type, _source)
      RETURNING id INTO v_conflict_id;
    END IF;
  END IF;

  RETURN QUERY SELECT v_customer_id, v_is_new, v_has_conflict, v_conflict_id;
END;
$$;

-- P0-5: Enforce NOT NULL on customer_id for entity tables
DELETE FROM public.food_orders WHERE customer_id IS NULL;
DELETE FROM public.dispatch_jobs WHERE customer_id IS NULL;
DELETE FROM public.reservations WHERE customer_id IS NULL;

ALTER TABLE public.food_orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.dispatch_jobs ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN customer_id SET NOT NULL;