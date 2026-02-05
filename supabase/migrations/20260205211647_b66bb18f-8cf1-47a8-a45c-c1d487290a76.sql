-- Add directions column to impound_lots for customer navigation instructions
ALTER TABLE public.impound_lots
ADD COLUMN IF NOT EXISTS directions text;