-- Add staff assignment to bookings (references tenant_users for staff/technician assignment)
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS staff_member_id uuid REFERENCES public.tenant_users(id);

-- Create index for staff-based calendar queries
CREATE INDEX IF NOT EXISTS idx_bookings_staff_member ON public.bookings(staff_member_id) WHERE staff_member_id IS NOT NULL;