/**
 * text-conversation
 *
 * Text-mode interface to the ElevenLabs voice agent.
 * Used by QA chains to test all 50+ scenarios without needing voice.
 * Same system prompt + business context as the real voice agent.
 * LLM: Claude (Anthropic) — swappable. Results mirror Gemini closely.
 *
 * POST body:
 *   tenantId: string
 *   message: string
 *   history?: Array<{role: "user"|"assistant", content: string}>
 *   callerPhone?: string   (default: +15550000000 for test)
 *   customerId?: string    (optional — for returning customer context)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import {
  buildBusinessContext,
  buildDynamicVariables,
} from "../_shared/buildBusinessContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache the ElevenLabs system prompt template for 1 hour
let cachedTemplate: string | null = null;
let templateCachedAt = 0;
const TEMPLATE_TTL_MS = 60 * 60 * 1000;

async function getAgentSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedTemplate && (now - templateCachedAt) < TEMPLATE_TTL_MS) {
    return cachedTemplate;
  }

  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID") || "agent_4701kg1vwhzqfxmvzh032nhvx434";
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

  if (!apiKey) {
    console.warn("[text-conversation] No ELEVENLABS_API_KEY — using fallback prompt");
    return getFallbackPrompt();
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!res.ok) {
      console.warn("[text-conversation] ElevenLabs fetch failed:", res.status);
      return cachedTemplate || getFallbackPrompt();
    }

    const data = await res.json();
    const prompt = data?.conversation_config?.agent?.prompt?.prompt;

    if (!prompt) {
      console.warn("[text-conversation] No prompt in agent config");
      return cachedTemplate || getFallbackPrompt();
    }

    cachedTemplate = prompt;
    templateCachedAt = now;
    return prompt;
  } catch (err) {
    console.error("[text-conversation] Error fetching agent config:", err);
    return cachedTemplate || getFallbackPrompt();
  }
}

function getFallbackPrompt(): string {
  return `You are the front-desk receptionist for {{business_name}}. You sound like a real human: warm, quick, confident, and helpful. Your job is to identify what the caller needs, collect minimum required details, and complete the correct outcome: book an appointment, answer a quick question, or take a message/callback. Your tone is: {{tone}}. You must be accurate. You are not a chatbot.`;
}

/**
 * Fill {{variable}} placeholders in the system prompt template.
 */
function fillTemplate(template: string, variables: Record<string, string | number | boolean>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = variables[key];
    if (val === undefined || val === null) return "";
    return String(val);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenantId, message, history = [], callerPhone, customerId } = await req.json();

    if (!tenantId || !message) {
      return new Response(JSON.stringify({ error: "tenantId and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build business context (same as elevenlabs-init)
    const callerPhoneE164 = callerPhone || "+15550000000";
    const { context } = await buildBusinessContext(supabase, {
      tenantId,
      channel: "browser_test",
      sessionId: crypto.randomUUID(),
      callerPhone: callerPhoneE164,
      customerId: customerId || null,
    });
    const vars = buildDynamicVariables(context, callerPhoneE164, customerId || null);

    // Get system prompt template from ElevenLabs and fill variables
    const template = await getAgentSystemPrompt();
    const systemPrompt = fillTemplate(template, vars as Record<string, string | number | boolean>);

    // Build message history for Claude
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...(history as Array<{ role: "user" | "assistant"; content: string }>),
      { role: "user", content: message },
    ];

    // Call Claude with the same context the voice agent has
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "";

    // Extract debug info if agent returns it (debug mode)
    let debugInfo: Record<string, string> = {};
    const debugMatch = reply.match(/tenant_id=(\S+)\s*\|.*?mode=(\S+)\s*\|.*?industry=(\S+)/);
    if (debugMatch) {
      debugInfo = {
        tenant_id: debugMatch[1],
        business_mode: debugMatch[2],
        industry_type: debugMatch[3],
      };
    }

    return new Response(JSON.stringify({
      reply,
      debug: {
        tenant_id: String(vars.tenant_id || tenantId),
        business_mode: String(vars.business_mode || ""),
        industry_type: String(vars.industry_type || ""),
        has_booking: String(vars.has_booking || ""),
        has_dispatch: String(vars.has_dispatch || ""),
        llm: "claude-haiku-4-5-20251001",
        template_cached: cachedTemplate !== null,
        ...debugInfo,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[text-conversation] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
