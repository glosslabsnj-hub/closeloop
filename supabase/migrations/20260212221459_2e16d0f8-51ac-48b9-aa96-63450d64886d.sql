
-- Add missing columns to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS duration_minutes INT;

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS price_cents INT;

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS price_breakdown JSONB;

-- Add missing customer_id to leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
