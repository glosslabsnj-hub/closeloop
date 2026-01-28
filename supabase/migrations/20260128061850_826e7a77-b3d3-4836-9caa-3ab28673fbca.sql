-- Add ai_enabled column to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;

-- Create enum for AI call direction
DO $$ BEGIN
    CREATE TYPE public.ai_call_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for AI call outcome
DO $$ BEGIN
    CREATE TYPE public.ai_call_outcome AS ENUM ('booked', 'followup', 'lost', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for AI knowledge type
DO $$ BEGIN
    CREATE TYPE public.ai_knowledge_type AS ENUM ('faq', 'objection', 'policy', 'upsell');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for AI tone
DO $$ BEGIN
    CREATE TYPE public.ai_tone AS ENUM ('friendly', 'professional', 'luxury', 'direct');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ai_assistants table
CREATE TABLE public.ai_assistants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'AI Assistant',
    voice_id TEXT,
    tone ai_tone NOT NULL DEFAULT 'friendly',
    greeting_script TEXT,
    fallback_script TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_call_sessions table
CREATE TABLE public.ai_call_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    call_direction ai_call_direction NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    outcome ai_call_outcome,
    transcript TEXT,
    summary TEXT,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_knowledge_base table
CREATE TABLE public.ai_knowledge_base (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type ai_knowledge_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority_weight INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_assistants
CREATE POLICY "Users can view tenant AI assistants"
ON public.ai_assistants FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage AI assistants"
ON public.ai_assistants FOR ALL
USING (
    (tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- RLS policies for ai_call_sessions
CREATE POLICY "Users can view tenant AI call sessions"
ON public.ai_call_sessions FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can manage tenant AI call sessions"
ON public.ai_call_sessions FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS policies for ai_knowledge_base
CREATE POLICY "Users can view tenant AI knowledge base"
ON public.ai_knowledge_base FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage AI knowledge base"
ON public.ai_knowledge_base FOR ALL
USING (
    (tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
);