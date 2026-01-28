-- Add new industry types to the enum
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'tire_shop';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'cleaning';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'landscaping';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pest_control';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'roofing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pool_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'moving';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'salon';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'fitness';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'photography';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pet_grooming';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'towing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'locksmith';

-- Add custom_industry column for "Other" industry type
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_industry TEXT;

-- Add context_fields_json column for industry-specific AI context requirements
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS context_fields_json JSONB DEFAULT '[]'::jsonb;