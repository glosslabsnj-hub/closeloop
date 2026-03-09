-- Add 'free' and 'deposit_based' to the price_type enum
-- Required for sales mode: test drives, appraisals, consultations are complimentary (free)
-- Also adds deposit_based which is used in testTenantMatrix.ts type definitions

ALTER TYPE public.price_type ADD VALUE IF NOT EXISTS 'free';
ALTER TYPE public.price_type ADD VALUE IF NOT EXISTS 'deposit_based';
