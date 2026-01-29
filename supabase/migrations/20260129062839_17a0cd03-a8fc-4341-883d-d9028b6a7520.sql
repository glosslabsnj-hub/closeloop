-- Add missing location_id column to phone_numbers for multi-location support
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.tenant_locations(id) ON DELETE SET NULL;