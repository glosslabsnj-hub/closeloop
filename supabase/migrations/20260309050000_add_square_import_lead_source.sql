-- Add 'square_import' to lead_source enum for leads imported from Square Appointments sync.
-- Without this, sync-square-availability fails to create leads for Square-originated bookings.
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'square_import';
