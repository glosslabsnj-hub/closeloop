-- Fix the overly permissive INSERT policy on owner_notifications
-- This should only allow service role inserts, not anonymous inserts
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.owner_notifications;

-- No INSERT policy needed for regular users - triggers use SECURITY DEFINER
-- This ensures only trigger functions can insert notifications