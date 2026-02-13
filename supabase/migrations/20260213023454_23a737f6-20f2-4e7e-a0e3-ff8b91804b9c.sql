-- Add 'pending' status to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending';
