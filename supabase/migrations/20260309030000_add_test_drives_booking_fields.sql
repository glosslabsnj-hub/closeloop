-- Migration: Add missing columns to test_drives table
--
-- Background: Migration 20260210120000 created the test_drives table with
-- rich scheduling fields (scheduled_date, scheduled_time, vehicle_* fields).
-- Migration 20260212214858 tried to CREATE TABLE IF NOT EXISTS with booking_id,
-- vehicle_description, and salesperson, but the table already existed so those
-- columns were never added. This migration adds the missing columns.
--
-- Also adds: 'scheduled' to the status CHECK constraint since the edge function
-- uses that value. Actually we keep the original enum and fix the edge function.

ALTER TABLE public.test_drives
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_description TEXT,
  ADD COLUMN IF NOT EXISTS salesperson TEXT;

CREATE INDEX IF NOT EXISTS idx_test_drives_booking ON public.test_drives(booking_id);
