ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS requires_dropoff boolean DEFAULT true;