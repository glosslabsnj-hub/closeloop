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
 *   sessionId?: string     (PREFERRED for multi-turn — server persists history by this ID in DB)
 *   history?: Array<{role: "user"|"assistant", content: string}>  (LEGACY — lossy, drops tool blocks)
 *   conversationMessages?: Array<MessageParam>  (client-managed history — full API-level with tool blocks)
 *   callerPhone?: string   (default: +15550000000 for test)
 *   customerId?: string    (optional — for returning customer context)
 *
 * sessionId usage: Pass the same sessionId across multiple calls and the server
 * automatically loads + saves conversation history. No need to thread conversationMessages.
 * Sessions are stored in text_conversation_sessions table. Ideal for QA agents.
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
    name: "suggest_availability",
    description: "Get available appointment time slots. Call when the customer asks 'What times do you have?', 'When can I come in?', 'What's available this week?', or when you need to check open slots before booking. Returns up to 5 available time slots.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date to check availability for. Accept 'tomorrow', 'next week', 'Saturday', or leave blank for next available." },
        service_name: { type: "string", description: "Service name to determine how long the slot needs to be" },
        preference: { type: "string", description: "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'" },
      },
      required: [],
    },
  },
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
        service_name: { type: "string", description: "Name of the service being booked. Use the service name the customer mentioned (e.g. 'AC Repair', 'Furnace Repair'). Do NOT substitute a different service name (e.g. do not change 'AC Repair' to 'AC Tune-Up')." },
        vehicle_type: { type: "string", description: "Vehicle type/size: 'sedan', 'suv', 'truck', 'van'. Important for services with vehicle-based pricing." },
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
 * Load conversation messages from server-side session storage.
 * Returns null if session not found (start fresh).
 */
async function loadSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<Anthropic.MessageParam[] | null> {
  const { data, error } = await supabase
    .from("text_conversation_sessions")
    .select("messages")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error(`[text-conversation] Session load error for ${sessionId}:`, error.message);
    return null;
  }
  return data ? (data.messages as Anthropic.MessageParam[]) : null;
}

/**
 * Save/upsert conversation messages to server-side session storage.
 */
async function saveSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  tenantId: string,
  messages: Anthropic.MessageParam[],
): Promise<void> {
  const { error } = await supabase
    .from("text_conversation_sessions")
    .upsert({
      id: sessionId,
      tenant_id: tenantId,
      messages: messages as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) {
    console.error(`[text-conversation] Session save error for ${sessionId}:`, error.message);
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
    suggest_availability: "elevenlabs-suggest-availability",
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
    const { tenantId, message, sessionId: reqSessionId, conversationId: reqConversationId, history = [], conversationMessages, callerPhone, customerId, channel: reqChannel } = await req.json();
    // Accept both 'sessionId' and 'conversationId' as aliases (QA uses conversationId)
    const sessionId = reqSessionId || reqConversationId;

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
    const effectiveChannel = reqChannel || "browser_test";
    const { context, systemPrompt: contextPrompt } = await buildBusinessContext(supabase, {
      tenantId,
      channel: effectiveChannel as "voice" | "sms" | "browser_test",
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
    // In text/browser_test mode there is no live phone call to transfer, so
    // override the voice-mode "transfer_to_owner" instruction from agentBasePrompts.
    // The correct text-mode behavior is: create_callback + honest messaging.
    const textTransferOverride = effectiveChannel !== "voice"
      ? `\n- TEXT CHANNEL OVERRIDE — transfer_to_owner is NOT available in text/chat. When a customer asks to speak to the owner or manager: call create_callback with reason="Requested to speak with owner/manager" and say "I'll let the owner know and have them reach out to you shortly." Do NOT say "let me transfer you" or imply a live transfer is happening.`
      : "";
    const toolReinforcement = `\n\nCRITICAL TOOL USAGE RULES:\n- When a caller asks for a callback or wants someone to call them back: you MUST call the create_callback tool. Do NOT just say "I'll have someone call you" without invoking the tool.\n${modeRules}${textTransferOverride}\n- Every action must be backed by a tool call that creates a real record.\n- CONTEXT CONTINUITY: You have access to the full conversation history above. Use it. Do NOT forget information the customer already provided (name, address, service needed). If they said "AC Repair" earlier, book "AC Repair" — do not substitute a different service name.\n- When calling create_booking, use the EXACT service name the customer requested, not a similar service from the catalog.\n\nANTI-FABRICATION RULES (ABSOLUTE — NEVER VIOLATE):\n- PRICING: ONLY quote prices that appear in your Business Brain context under services_pricing. If a price is NOT listed, say "I can have someone call you with an exact quote." Do NOT invent any dollar amount.\n- DEPOSITS: ONLY mention a deposit if deposit_required=true AND deposit_amount is set in your context. If deposit_required is false or not set, NEVER mention a deposit requirement.\n- PROMOTIONS/SPECIALS: NEVER mention seasonal specials, limited-time offers, discounts, or promotions unless they appear explicitly in your POLICIES or SERVICES data. Do NOT invent "$79 seasonal specials", "spring deals", or any promotional pricing.\n- DISCOUNTS: NEVER offer or mention military, senior, first-time, or loyalty discounts unless explicitly listed in your context with a specific dollar amount or percentage.\n- If you are unsure whether something is in your data, say "Let me have someone from our team call you with the details." NEVER guess.`;

    // SMS-specific prompt layer — teaches the AI to be a great texter
    const smsPromptLayer = effectiveChannel === "sms" ? `

SMS CONVERSATION RULES (you are texting with a real customer):
- You ARE the business. Speak as ${context.tenant.business_name || "the business"}, first person. Use "we" and "I" naturally.
- Keep messages SHORT. Under 320 characters when possible. No essays.
- Be warm, conversational, and human. Text like a real person would.
- Match the customer's energy — casual if they're casual, professional if they're formal.
- NEVER say "I'm an AI", "as an AI assistant", "AI automated", or anything that reveals you're automated. You are the business texting them.
- NEVER use letter-option menus like "Reply A, B, C, D, or E." That looks robotic. Instead, just suggest services naturally: "We can do an exterior wash, interior detail, or a full combo. What sounds good?"
- NEVER use numbered lists, bullet points, or formatted menus in texts. Write like a real person texts.
- When they want to book/cancel/reschedule, collect what you need and USE THE TOOLS. Don't just say you'll do it.
- If you already know their phone number (you do — they're texting you), don't ask for it.
- For bookings: confirm date, time, and service, then call create_booking immediately.
- For cancellations: call cancel_booking with their phone number — you have it.
- For changes (different service, time, etc.): call reschedule_booking or cancel + rebook as needed.
- Only escalate to a human callback when you truly cannot help (complex custom quotes, complaints, issues requiring physical inspection).
- End messages with a clear next step when appropriate (not every message needs one).
- If they're a returning customer and you know their name, use it naturally.
- Always respond to follow-up messages. If a customer texts back after a booking to change something, handle it immediately.
` : "";

    // Assemble final system prompt: date/time + canonical business context + SMS layer + tool rules
    const systemPrompt = `CURRENT DATE AND TIME: ${currentDateTime} (${tz})\n\n${contextPrompt}${smsPromptLayer}${toolReinforcement}`;

    // --- Resolve starting conversation history ---
    // Priority: sessionId (server-stored) > conversationMessages (client-managed) > history (legacy string-only)
    let startingMessages: Anthropic.MessageParam[];

    if (sessionId) {
      const sessionMessages = await loadSession(supabase, sessionId);
      startingMessages = sessionMessages || [];
      console.log(`[text-conversation] Session ${sessionId}: loaded ${startingMessages.length} messages`);
    } else if (conversationMessages) {
      startingMessages = conversationMessages as Anthropic.MessageParam[];
    } else {
      startingMessages = (history as Array<{ role: "user" | "assistant"; content: string }>).map(m => ({
        role: m.role,
        content: m.content,
      }));
    }

    const messages: Anthropic.MessageParam[] = [
      ...startingMessages,
      { role: "user", content: message },
    ];

    // Get tool definitions based on business mode
    const tools = getToolDefinitions(businessMode);

    // Call Claude with tools
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
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
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract final text reply
    let textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    let reply = textBlocks.map(b => b.text).join("\n") || "";

    // If Claude returned no text after tool calls, prompt it to formulate a spoken response
    if (!reply && toolCalls.length > 0) {
      console.log(`[text-conversation] Empty reply after ${toolCalls.length} tool calls — prompting for spoken response`);
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: [{ type: "text" as const, text: "Please respond to the customer based on the tool results above." }] });
      const retryResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages,
        tools,
      });
      textBlocks = retryResponse.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      reply = textBlocks.map(b => b.text).join("\n") || "";
      // Update response so we save the retry turn to session history
      if (reply) {
        messages.push({ role: "assistant", content: retryResponse.content });
      }
    }

    // Build full conversation history including this turn's assistant response.
    // If we did a retry (empty reply fix), messages already includes the final assistant turn.
    // Otherwise, append the last response.
    const lastMsg = messages[messages.length - 1];
    const conversationMessagesOut = (lastMsg?.role === "assistant")
      ? messages
      : messages.concat([{ role: "assistant", content: response.content }]);

    // Persist session if sessionId was provided (enables stateful multi-turn for QA curl calls)
    if (sessionId) {
      await saveSession(supabase, sessionId, tenantId, conversationMessagesOut);
      console.log(`[text-conversation] Session ${sessionId}: saved ${conversationMessagesOut.length} messages`);
    }

    return new Response(JSON.stringify({
      reply,
      toolCalls,
      sessionId: sessionId || null,
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
        llm: "claude-sonnet-4-6",
        prompt_source: "buildBusinessContext",
        tool_calls_count: toolCalls.length,
        session_mode: sessionId ? "server_session" : (conversationMessages ? "client_managed" : "legacy"),
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
