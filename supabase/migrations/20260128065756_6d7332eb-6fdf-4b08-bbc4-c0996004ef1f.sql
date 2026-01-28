-- Fix search_path for normalize_phone_e164 function
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters except leading +
  cleaned := regexp_replace(phone, '[^0-9+]', '', 'g');
  
  -- If starts with +, keep it
  IF left(cleaned, 1) = '+' THEN
    RETURN cleaned;
  END IF;
  
  -- If 10 digits, assume US and add +1
  IF length(cleaned) = 10 THEN
    RETURN '+1' || cleaned;
  END IF;
  
  -- If 11 digits starting with 1, add +
  IF length(cleaned) = 11 AND left(cleaned, 1) = '1' THEN
    RETURN '+' || cleaned;
  END IF;
  
  -- Otherwise return as-is with + prefix
  RETURN '+' || cleaned;
END;
$$;

-- Fix update_tenant_readiness_score trigger function
CREATE OR REPLACE FUNCTION public.update_tenant_readiness_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Handle DELETE case
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
  END IF;
  
  UPDATE tenants 
  SET ai_readiness_score = calculate_ai_readiness(v_tenant_id)
  WHERE id = v_tenant_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;