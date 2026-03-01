
ALTER TABLE services
  ADD COLUMN complexity text NOT NULL DEFAULT 'simple',
  ADD COLUMN price_factors text DEFAULT NULL;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_service_complexity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complexity NOT IN ('simple', 'complex') THEN
    RAISE EXCEPTION 'complexity must be simple or complex';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_service_complexity ON public.services;
CREATE TRIGGER trg_validate_service_complexity
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_complexity();

-- Smart defaults for existing services
UPDATE services SET complexity = 'complex'
WHERE lower(name) ~* '(repair|diagnostic|custom|restoration|rebuild|overhaul|electrical|transmission|engine|collision|surgery|procedure|consultation|assessment|heavy.?duty|accident|recovery|color.?correction|balayage|perm)'
  AND complexity = 'simple';
