-- P0 FIX: Add session_id FK to derived entity tables for call-to-entity audit trail
-- This enables tracking which phone call created which order/reservation/booking/dispatch job

-- Add session_id to food_orders
ALTER TABLE public.food_orders 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Add session_id to reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Add session_id to dispatch_jobs
ALTER TABLE public.dispatch_jobs 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Add session_id to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Create indexes for efficient joins
CREATE INDEX IF NOT EXISTS idx_food_orders_session_id ON public.food_orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON public.reservations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_session_id ON public.dispatch_jobs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON public.bookings(session_id) WHERE session_id IS NOT NULL;