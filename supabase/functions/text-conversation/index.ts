/**
 * text-conversation
 *
 * Text-mode interface to the AI voice agent WITH tool calling.
 * Used by QA to test all scenarios (including booking creation) without voice.
 * Uses the CANONICAL system prompt from buildBusinessContext — same business
 * knowledge as real voice calls (hours, FAQs, greeting, services, policies, etc.)
 * LLM: Claude Haiku — tool calls execute against real edge functions.
 *
 * POST body:
 *   tenantId: string
 *   message: string
 *   history?: Array<{role: "user"|"assistant", content: string}>  (LEGACY — lossy, drops tool blocks)
 *   conversationMessages?: Array<MessageParam>  (PREFERRED — full API-level history with tool blocks)
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

/**
 * Shared tools available to ALL business modes.
 */
const SHARED_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_callback",
    description: "Create a callback request record. You MUST use this tool whenever: (1) a caller asks for someone to call them back, (2) a caller requests the owner or manager contact them, (3) you need to escalate a complex request like a custom quote, (4) the caller has a complaint, or (5) ai_behavior_mode is callback_only. Do NOT just verbally confirm a callback — always invoke this tool to create the record.",
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
    description: "Check if an address is within the business's service area. Returns distance, ETA, and pricing info.",
    input_schema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "Customer's address to validate" },
        vehicle_type: { type: "string", description: "Vehicle type (for dispatch pricing)" },
      },
      required: ["address"],
    },
  },
];

/**
 * Service-mode tools (booking-based businesses).
 */
const SERVICE_TOOLS: Anthropic.Tool[] = [
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

/**
 * Dispatch-mode tools (towing, roadside, courier, etc.).
 */
const DISPATCH_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_dispatch_job",
    description: "Create a dispatch job to send a driver/technician to the customer. Use after collecting: pickup address, service type, customer name, and urgency. For towing/transport, also collect dropoff address.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string", description: "Customer's full name" },
        customer_phone: { type: "string", description: "Customer's phone number" },
        pickup_address: { type: "string", description: "Where to pick up / where the customer is" },
        dropoff_address: { type: "string", description: "Where to deliver/tow to (required for towing, optional otherwise)" },
        service_type: { type: "string", description: "Type of service needed (e.g. 'tow', 'jump start', 'lockout', 'tire change')" },
        vehicle_info: { type: "string", description: "Vehicle description (year, make, model, color)" },
        drivable: { type: "boolean", description: "Whether the vehicle is drivable" },
        urgency: { type: "string", description: "Urgency level: emergency, urgent, standard, same_day, scheduled" },
        notes: { type: "string", description: "Additional notes for the driver" },
      },
      required: ["pickup_address", "service_type"],
    },
  },
  {
    name: "lookup_dispatch_status",
    description: "Look up the status of an existing dispatch job. Use when a customer calls to check on their driver/technician.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string", description: "Customer's name to look up" },
        customer_phone: { type: "string", description: "Customer's phone to look up" },
        job_number: { type: "string", description: "Job number if known" },
      },
      required: ["customer_phone"],
    },
  },
  {
    name: "cancel_dispatch_job",
    description: "Cancel an existing dispatch job. Use when the customer wants to cancel their pending dispatch.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string", description: "Customer's name" },
        customer_phone: { type: "string", description: "Customer's phone" },
        job_number: { type: "string", description: "Job number if known" },
        reason: { type: "string", description: "Reason for cancellation" },
      },
      required: ["customer_phone"],
    },
  },
];

/**
 * Get tool definitions based on tenant business mode.
 */
function getToolDefinitions(businessMode: string): Anthropic.Tool[] {
  switch (businessMode) {
    case "dispatch":
      return [...SHARED_TOOLS, ...DISPATCH_TOOLS];
    case "service":
    default:
      return [...SHARED_TOOLS, ...SERVICE_TOOLS];
  }
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
    // Service mode tools
    create_booking: "elevenlabs-create-booking",
    check_availability: "elevenlabs-check-availability",
    cancel_booking: "elevenlabs-cancel-booking",
    reschedule_booking: "elevenlabs-reschedule-booking",
    // Shared tools
    create_callback: "elevenlabs-create-callback",
    check_service_area: "elevenlabs-check-service-area",
    // Dispatch mode tools
    create_dispatch_job: "elevenlabs-create-dispatch-job",
    lookup_dispatch_status: "elevenlabs-lookup-dispatch-status",
    cancel_dispatch_job: "elevenlabs-cancel-dispatch-job",
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
    const { tenantId, message, history = [], conversationMessages, callerPhone, customerId } = await req.json();

    if (!tenantId || !message) {
      return new Response(JSON.stringify({ error: "tenantId and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build business context — the canonical source of truth for all AI context
    // systemPrompt already includes: hours, FAQs, greeting, services, policies, tone, mode-specific prompts
    const callerPhoneE164 = callerPhone || "+15550000000";
    const { context, systemPrompt: contextPrompt } = await buildBusinessContext(supabase, {
      tenantId,
      channel: "browser_test",
      sessionId: crypto.randomUUID(),
      callerPhone: callerPhoneE164,
      customerId: customerId || null,
    });
    const vars = buildDynamicVariables(context, callerPhoneE164, customerId || null);

    // Add current date/time for scheduling awareness
    const now = new Date();
    const tz = context.tenant.timezone || 'America/New_York';
    let currentDateTime: string;
    try {
      currentDateTime = now.toLocaleString('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      currentDateTime = now.toISOString();
    }

    // Reinforce tool usage based on business mode
    const businessMode = context.tenant.business_mode || "service";
    const serviceRules = `- When a caller wants to book: you MUST call create_booking. Do NOT just confirm verbally.\n- When a caller wants to cancel: you MUST call cancel_booking.\n- When a caller wants to reschedule: you MUST call reschedule_booking.`;
    const dispatchRules = `- When a caller needs help dispatched (tow truck, driver, technician): you MUST call create_dispatch_job after collecting location and service type.\n- When a caller asks about their dispatch status: you MUST call lookup_dispatch_status.\n- When a caller wants to cancel a dispatch: you MUST call cancel_dispatch_job.`;
    const modeRules = businessMode === "dispatch" ? dispatchRules : serviceRules;
    const toolReinforcement = `\n\nCRITICAL TOOL USAGE RULES:\n- When a caller asks for a callback or wants someone to call them back: you MUST call the create_callback tool. Do NOT just say "I'll have someone call you" without invoking the tool.\n${modeRules}\n- Every action must be backed by a tool call that creates a real record.`;

    // Assemble final system prompt: date/time + canonical business context + tool rules
    const systemPrompt = `CURRENT DATE AND TIME: ${currentDateTime} (${tz})\n\n${contextPrompt}${toolReinforcement}`;

    // Build message history for Claude
    // Prefer conversationMessages (full API-level history with tool blocks) over legacy history (string-only, lossy)
    const messages: Anthropic.MessageParam[] = conversationMessages
      ? [...conversationMessages, { role: "user", content: message }]
      : [
          ...(history as Array<{ role: "user" | "assistant"; content: string }>),
          { role: "user", content: message },
        ];

    // Get tool definitions based on business mode
    const tools = getToolDefinitions(businessMode);

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
    let callbackCreated = false;
    let callbackId: string | null = null;
    let dispatchCreated = false;
    let dispatchId: string | null = null;
    let dispatchJobNumber: string | null = null;
    let dispatchCancelled = false;

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
        if (toolUse.name === "create_callback" && result.success) {
          callbackCreated = true;
          callbackId = (result.callback_id || result.opportunity_id) as string || null;
        }
        if (toolUse.name === "create_dispatch_job" && result.success) {
          dispatchCreated = true;
          dispatchId = (result.dispatch_id) as string || null;
          dispatchJobNumber = (result.job_number) as string || null;
        }
        if (toolUse.name === "cancel_dispatch_job" && result.success) {
          dispatchCancelled = true;
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

    // Return full conversation history so the frontend can send it back on the next turn
    // This preserves tool_use and tool_result blocks that the legacy string-only history drops
    const conversationMessagesOut = messages.concat([
      { role: "assistant", content: response.content },
    ]);

    return new Response(JSON.stringify({
      reply,
      toolCalls,
      conversationMessages: conversationMessagesOut,
      bookingCreated,
      bookingId,
      bookingCancelled,
      bookingRescheduled,
      callbackCreated,
      callbackId,
      dispatchCreated,
      dispatchId,
      dispatchJobNumber,
      dispatchCancelled,
      debug: {
        tenant_id: String(vars.tenant_id || tenantId),
        business_mode: String(vars.business_mode || ""),
        industry_type: String(vars.industry_type || ""),
        has_booking: String(vars.has_booking || ""),
        has_dispatch: String(vars.has_dispatch || ""),
        llm: "claude-haiku-4-5-20251001",
        prompt_source: "buildBusinessContext",
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
