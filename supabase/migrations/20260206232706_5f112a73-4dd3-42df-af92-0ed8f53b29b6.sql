-- Add service_default_flow column to assistant_settings
-- This controls how service businesses handle incoming calls:
-- schedule_first: Go straight to booking (salons, detailing, cleaning)
-- urgency_check: Ask if urgent first (HVAC, plumbing, electrical)
-- dispatch_first: Immediate dispatch like tow service

ALTER TABLE public.assistant_settings 
ADD COLUMN IF NOT EXISTS service_default_flow text DEFAULT 'schedule_first'
CHECK (service_default_flow IN ('schedule_first', 'urgency_check', 'dispatch_first'));

-- Add comment for documentation
COMMENT ON COLUMN public.assistant_settings.service_default_flow IS 
'Controls service call flow: schedule_first (default), urgency_check, or dispatch_first';