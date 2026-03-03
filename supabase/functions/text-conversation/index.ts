/**
 * text-conversation
 *
 * Text-mode interface to the ElevenLabs voice agent WITH tool calling.
 * Used by QA to test all scenarios (including booking creation) without voice.
 * Same system prompt + business context + tools as the real voice agent.
 * LLM: Claude Haiku — tool calls execute against real edge functions.
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

function fillTemplate(template: string, variables: Record<string, string | number | boolean>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const val = variables[key];
    if (val === undefined || val === null) return "";
    return String(val);
  });
}

/**
 * Claude tool definitions matching the ElevenLabs agent tools.
 */
function getToolDefinitions(tenantId: string): Anthropic.Tool[] {
  return [
    {
      name: "create_booking",
      description: "Create an appointment booking after the customer has confirmed the date, time, and service. Use this when you have collected all required details and the customer agrees to book.",
      input_schema: {
        type: "object" as const,
        properties: {
          customer_name: { type: "string", description: "Customer's full name" },
          customer_phone: { type: "string", description: "Customer's phone number" },
          customer_email: { type: "string", description: "Customer's email (optional)" },
          date: { type: "string", description: "Appointment date (e.g. 'tomorrow', 'March 5', '2026-03-05')" },
          time: { type: "string", description: "Appointment time (e.g. '9am', '2:30 PM', '14:00')" },
          service_name: { type: "string", description: "Name of the service being booked" },
          notes: { type: "string", description: "Any additional notes from the customer" },
        },
        required: ["customer_name", "date", "time"],
      },
    },
    {
      name: "check_availability",
      description: "Check if a specific date and time slot is available for booking.",
      input_schema: {
        type: "object" as const,
        properties: {
          date: { type: "string", description: "Date to check (e.g. 'tomorrow', 'March 5')" },
          time: { type: "string", description: "Time to check (e.g. '9am', '2:30 PM')" },
        },
        required: ["date", "time"],
      },
    },
    {
      name: "create_callback",
      description: "Schedule a callback for the customer when you cannot handle their request directly (e.g. complex quotes, owner questions, complaints).",
      input_schema: {
        type: "object" as const,
        properties: {
          customer_name: { type: "string", description: "Customer's full name" },
          customer_phone: { type: "string", description: "Customer's phone number" },
          reason: { type: "string", description: "Why the callback is needed" },
        },
        required: ["customer_name", "customer_phone", "reason"],
      },
    },
    {
      name: "check_service_area",
      description: "Check if an address is within the business's service area.",
      input_schema: {
        type: "object" as const,
        properties: {
          address: { type: "string", description: "Customer's address to validate" },
        },
        required: ["address"],
      },
    },
    {
      name: "cancel_booking",
      description: "Cancel an existing appointment booking. Use when the customer wants to cancel their upcoming appointment.",
      input_schema: {
        type: "object" as const,
        properties: {
          customer_name: { type: "string", description: "Customer's full name to look up the booking" },
          customer_phone: { type: "string", description: "Customer's phone number to look up the booking" },
          booking_id: { type: "string", description: "Direct booking ID if known" },
          reason: { type: "string", description: "Reason for cancellation" },
        },
        required: ["customer_name"],
      },
    },
    {
      name: "reschedule_booking",
      description: "Reschedule an existing appointment to a new date and time. Use when the customer wants to move their appointment.",
      input_schema: {
        type: "object" as const,
        properties: {
          customer_name: { type: "string", description: "Customer's full name to look up the booking" },
          customer_phone: { type: "string", description: "Customer's phone number to look up the booking" },
          booking_id: { type: "string", description: "Direct booking ID if known" },
          new_date: { type: "string", description: "New appointment date (e.g. 'tomorrow', 'March 5', '2026-03-05')" },
          new_time: { type: "string", description: "New appointment time (e.g. '9am', '2:30 PM', '14:00')" },
        },
        required: ["customer_name", "new_date", "new_time"],
      },
    },
  ];
}

/**
 * Execute a tool by calling the corresponding edge function.
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  tenantId: string,
  callerPhone: string,
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const endpointMap: Record<string, string> = {
    create_booking: "elevenlabs-create-booking",
    check_availability: "elevenlabs-check-availability",
    create_callback: "elevenlabs-create-callback",
    check_service_area: "elevenlabs-check-service-area",
    cancel_booking: "elevenlabs-cancel-booking",
    reschedule_booking: "elevenlabs-reschedule-booking",
  };

  const endpoint = endpointMap[toolName];
  if (!endpoint) {
    return { error: `Unknown tool: ${toolName}` };
  }

  // Build request body with tenant context
  const body: Record<string, unknown> = {
    ...toolInput,
    tenant_id: tenantId,
    customer_phone: toolInput.customer_phone || callerPhone,
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(`[text-conversation] Tool ${toolName} result:`, JSON.stringify(data).slice(0, 200));
    return data;
  } catch (err) {
    console.error(`[text-conversation] Tool ${toolName} error:`, err);
    return { error: `Tool execution failed: ${String(err)}` };
  }
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
    const messages: Anthropic.MessageParam[] = [
      ...(history as Array<{ role: "user" | "assistant"; content: string }>),
      { role: "user", content: message },
    ];

    // Get tool definitions
    const tools = getToolDefinitions(tenantId);

    // Call Claude with tools
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    let response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages,
      tools,
    });

    // Track tool calls for debug output
    const toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: Record<string, unknown> }> = [];
    let bookingCreated = false;
    let bookingId: string | null = null;
    let bookingCancelled = false;
    let bookingRescheduled = false;

    // Handle tool use loop (max 3 iterations to prevent infinite loops)
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < 3) {
      iterations++;

      // Extract tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[text-conversation] Tool call: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0, 200));

        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          tenantId,
          callerPhoneE164,
        );

        toolCalls.push({
          tool: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
        });

        // Track booking creation / cancellation / reschedule
        if (toolUse.name === "create_booking" && result.success && result.booking_id) {
          bookingCreated = true;
          bookingId = result.booking_id as string;
        }
        if (toolUse.name === "cancel_booking" && result.success) {
          bookingCancelled = true;
        }
        if (toolUse.name === "reschedule_booking" && result.success) {
          bookingRescheduled = true;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Send tool results back to Claude
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract final text reply
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const reply = textBlocks.map(b => b.text).join("\n") || "";

    return new Response(JSON.stringify({
      reply,
      toolCalls,
      bookingCreated,
      bookingId,
      bookingCancelled,
      bookingRescheduled,
      debug: {
        tenant_id: String(vars.tenant_id || tenantId),
        business_mode: String(vars.business_mode || ""),
        industry_type: String(vars.industry_type || ""),
        has_booking: String(vars.has_booking || ""),
        has_dispatch: String(vars.has_dispatch || ""),
        llm: "claude-haiku-4-5-20251001",
        template_cached: cachedTemplate !== null,
        tool_calls_count: toolCalls.length,
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
