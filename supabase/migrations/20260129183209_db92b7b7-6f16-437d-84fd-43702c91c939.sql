-- Fix ai_event_logs RLS policy to restrict writes to service role only via function
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage event logs" ON public.ai_event_logs;

-- Create a restrictive INSERT policy that only allows inserts via security definer function
-- Since edge functions use service_role key which bypasses RLS, we just need tenant users read access
-- The writes will happen from edge functions with service_role which bypasses RLS