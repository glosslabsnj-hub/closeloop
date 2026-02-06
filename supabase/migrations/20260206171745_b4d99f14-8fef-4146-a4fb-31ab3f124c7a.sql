-- Add logged_by_driver_id column to track which driver logged the vehicle
ALTER TABLE public.impound_vehicles 
ADD COLUMN IF NOT EXISTS logged_by_driver_id UUID REFERENCES public.fleet_drivers(id) ON DELETE SET NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_logged_by_driver 
ON public.impound_vehicles(logged_by_driver_id) WHERE logged_by_driver_id IS NOT NULL;