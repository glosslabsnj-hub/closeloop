-- Add 'manager' to user_role enum (must be in separate transaction from usage)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
