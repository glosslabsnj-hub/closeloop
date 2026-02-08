-- Fix the revenue attribution trigger to map dispatch job statuses correctly
-- The issue: dispatch_jobs uses statuses like 'assigned', 'en_route', 'on_site' 
-- but revenue_attributions only allows 'pending', 'completed', 'cancelled'

CREATE OR REPLACE FUNCTION fn_attribution_on_dispatch_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attribution_status text;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    -- Map dispatch job status to valid attribution status
    -- 'assigned', 'en_route', 'on_site' are all still "in progress" so map to 'pending'
    attribution_status := CASE 
      WHEN NEW.status IN ('completed') THEN 'completed'
      WHEN NEW.status IN ('cancelled') THEN 'cancelled'
      ELSE 'pending'  -- pending, assigned, en_route, on_site all map to pending
    END;
    
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'dispatch_job', NEW.id, NEW.session_id,
      COALESCE(NEW.price_cents, 0), attribution_status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = COALESCE(EXCLUDED.revenue_cents, revenue_attributions.revenue_cents, 0),
      status = EXCLUDED.status,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;