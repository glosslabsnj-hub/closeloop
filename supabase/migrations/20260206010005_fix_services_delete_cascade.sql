-- P1 #13: Change bookings.service_id from ON DELETE SET NULL to ON DELETE RESTRICT
--
-- If a service is deleted while bookings reference it, the booking loses
-- its service link silently. RESTRICT prevents accidental deletion of
-- services that have active bookings.

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id)
  ON DELETE RESTRICT;
