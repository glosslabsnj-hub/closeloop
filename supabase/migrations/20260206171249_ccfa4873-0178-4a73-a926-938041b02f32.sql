-- Fix the function search path for the fleet trigger
CREATE OR REPLACE FUNCTION public.update_fleet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;