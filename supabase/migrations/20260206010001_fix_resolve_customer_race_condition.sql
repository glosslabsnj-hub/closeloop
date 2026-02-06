-- P0-3: Fix race condition in resolve_customer()
--
-- The original function does SELECT → check → INSERT, which allows two
-- concurrent calls with the same phone to both see "not found" and both
-- attempt INSERT, causing a unique constraint violation.
--
-- Fix: Use INSERT ... ON CONFLICT to atomically handle the upsert.

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
  -- Normalize phone to E.164
  v_phone_e164 := normalize_phone_e164(_phone);

  IF v_phone_e164 IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  -- Atomically insert or get existing customer (race-condition safe)
  INSERT INTO customers (tenant_id, phone_e164, phone_raw, full_name, email, source)
  VALUES (_tenant_id, v_phone_e164, _phone, COALESCE(_name, 'Unknown'), _email, _source)
  ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
    -- Only update email if it was previously null
    email = COALESCE(customers.email, EXCLUDED.email),
    updated_at = now()
  RETURNING id, (xmax = 0) AS was_inserted INTO v_customer_id, v_is_new;

  -- If customer already existed (was not inserted), check for conflicts
  IF NOT v_is_new THEN
    SELECT * INTO v_existing_customer
    FROM customers c
    WHERE c.id = v_customer_id;

    -- Check name conflict (if new name provided and different from stored)
    IF _name IS NOT NULL AND _name != '' AND v_existing_customer.full_name IS DISTINCT FROM _name AND v_existing_customer.full_name != 'Unknown' THEN
      v_has_conflict := true;
      v_conflict_type := 'name_mismatch';
    END IF;

    -- Check email conflict (if new email provided and different from stored)
    IF _email IS NOT NULL AND _email != '' AND v_existing_customer.email IS NOT NULL AND v_existing_customer.email != _email THEN
      IF v_has_conflict THEN
        v_conflict_type := 'both_mismatch';
      ELSE
        v_has_conflict := true;
        v_conflict_type := 'email_mismatch';
      END IF;
    END IF;

    -- If conflict, create merge queue item (don't overwrite existing data)
    IF v_has_conflict THEN
      INSERT INTO customer_merge_queue (tenant_id, existing_customer_id, incoming_phone_e164, incoming_name, incoming_email, conflict_type, source)
      VALUES (_tenant_id, v_customer_id, v_phone_e164, _name, _email, v_conflict_type, _source)
      RETURNING id INTO v_conflict_id;
    END IF;
  END IF;

  RETURN QUERY SELECT v_customer_id, v_is_new, v_has_conflict, v_conflict_id;
END;
$$;
