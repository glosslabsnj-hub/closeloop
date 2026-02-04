-- Migration: Expand industry_type enum to include all 98 industries from industryCatalog
-- This ensures all industries in the catalog can be stored in the database
-- Using IF NOT EXISTS pattern for idempotency

-- Home Services
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'plumbing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'painting';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'flooring';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pressure_washing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'garage_door';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'appliance_repair';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'handyman';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'junk_removal';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'tree_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'fencing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'window_cleaning';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'chimney_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'insulation';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'solar';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'concrete';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'siding';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'gutter';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'irrigation';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'masonry';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'drywall';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'carpet_cleaning';

-- Auto Services
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'auto_detailing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'auto_repair';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'auto_glass';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'body_shop';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'car_wash';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'window_tinting';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'mobile_mechanic';

-- Dispatch & Logistics
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'roadside_assistance';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'courier';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'medical_transport';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'delivery_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'field_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'landscaping_dispatch';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'cleaning_dispatch';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'mobile_detailing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pest_control_dispatch';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'locksmith';

-- Beauty & Wellness
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'nail_salon';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'spa';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'massage';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'tattoo';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'esthetics';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'brow_lash';

-- Health & Medical
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'primary_care';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'urgent_care';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'orthodontics';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'optometry';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'chiropractic';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'physical_therapy';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'dermatology';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'mental_health';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pediatrics';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'veterinary';

-- Food & Hospitality
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pizzeria';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'fast_casual';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'bakery';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'coffee_shop';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'food_truck';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'catering_service';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'bar';

-- Pet Services
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pet_boarding';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'dog_training';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'dog_walking';

-- Fitness & Recreation
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'personal_training';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'yoga';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'pilates';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'martial_arts';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'dance_studio';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'golf';

-- Events & Entertainment
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'videography';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'dj';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'event_venue';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'wedding_planner';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'music_lessons';

-- Professional Services
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'accounting';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'insurance';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'financial_advisor';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'tutoring';

-- Property & Real Estate
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'real_estate';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'property_management';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'home_inspection';

-- Note: Legacy enum values (detailing, plumber, fitness, hvac) are kept for backwards compatibility
-- New code should use the canonical slugs (auto_detailing, plumbing, personal_training/yoga/etc)
