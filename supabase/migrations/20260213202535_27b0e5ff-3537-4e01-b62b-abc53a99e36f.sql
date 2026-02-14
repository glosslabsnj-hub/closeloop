ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS service_address text,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new';