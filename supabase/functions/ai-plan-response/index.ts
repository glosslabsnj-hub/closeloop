import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Intent = 'booking' | 'quote' | 'service_info' | 'pricing' | 'hours' | 'location' | 
              'cancel' | 'reschedule' | 'objection' | 'urgent' | 'greeting' | 'other';

interface ResponsePlan {
  intent: Intent;
  confidence: string;
  required_info_to_collect: string[];
  facts_to_use: Array<{ source: string; content: string }>;
  policy_constraints: string[];
  guardrails_applied: string[];
  next_action: 'offer_slots' | 'provide_info' | 'request_details' | 'escalate' | 'book' | 'callback';
  draft_reply: string;
  sources_used: Array<{ type: string; id: string }>;
  knowledge_gap_detected: boolean;
  gap_description?: string;
}

// Detect intent from message
function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  
  if (/\b(book|schedule|appointment|reserve|slot)\b/.test(lower)) return 'booking';
  if (/\b(price|cost|how much|quote|estimate|pricing)\b/.test(lower)) return 'quote';
  if (/\b(cancel|cancellation)\b/.test(lower)) return 'cancel';
  if (/\b(reschedule|change.*time|move.*appointment)\b/.test(lower)) return 'reschedule';
  if (/\b(hours|open|close|when.*open)\b/.test(lower)) return 'hours';
  if (/\b(where|location|address|directions)\b/.test(lower)) return 'location';
  if (/\b(urgent|emergency|asap|right now)\b/.test(lower)) return 'urgent';
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(lower) && lower.length < 30) return 'greeting';
  if (/\b(what.*service|do you|can you|offer)\b/.test(lower)) return 'service_info';
  if (/\b(too expensive|too much|competitor|elsewhere|think about it)\b/.test(lower)) return 'objection';
  
  return 'other';
}

// Generate draft reply using AI
async function generateReply(
  brain: any,
  snippets: any[],
  userMessage: string,
  intent: Intent,
  channel: string,
  lovableApiKey: string
): Promise<{ reply: string; next_action: string }> {
  
  // Build system prompt from brain
  let systemPrompt = `You are an AI assistant for ${brain.business.name}`;
  if (brain.business.tagline) systemPrompt += ` - ${brain.business.tagline}`;
  systemPrompt += `.

COMMUNICATION STYLE: Be ${brain.ai_settings?.tone || 'friendly'} in your responses.
CHANNEL: ${channel === 'sms' ? 'SMS (keep responses under 300 characters)' : 'Phone call (be conversational)'}

BUSINESS INFORMATION:
- Industry: ${brain.business.industry}
- Phone: ${brain.business.phone || 'Not provided'}
- Address: ${brain.business.address || 'Not provided'}

`;

  // Add services summary
  if (brain.services.length > 0) {
    systemPrompt += `SERVICES:\n`;
    for (const s of brain.services.slice(0, 5)) {
      systemPrompt += `- ${s.name}`;
      if (s.price_type === 'fixed' && s.price_amount) systemPrompt += ` - $${s.price_amount}`;
      else if (s.price_type === 'starting_at' && s.price_amount) systemPrompt += ` - starting at $${s.price_amount}`;
      else systemPrompt += ` - quote required`;
      systemPrompt += ` (${s.duration_minutes} min)\n`;
    }
    systemPrompt += '\n';
  }

  // Add relevant knowledge snippets
  if (snippets.length > 0) {
    systemPrompt += `RELEVANT KNOWLEDGE FOR THIS QUERY:\n`;
    for (const s of snippets.slice(0, 5)) {
      systemPrompt += `[${s.source_type.toUpperCase()}] ${s.title}: ${s.content}\n\n`;
    }
  }

  // Add policies
  systemPrompt += `POLICIES:\n`;
  if (brain.policies.cancellation) systemPrompt += `- Cancellation: ${brain.policies.cancellation}\n`;
  if (brain.policies.deposit) systemPrompt += `- Deposit: ${brain.policies.deposit}\n`;
  if (brain.policies.refund) systemPrompt += `- Refund: ${brain.policies.refund}\n`;
  systemPrompt += '\n';

  // Add guardrails
  if (brain.guardrails.never_promise.length > 0) {
    systemPrompt += `NEVER PROMISE OR SAY:\n`;
    for (const np of brain.guardrails.never_promise) {
      systemPrompt += `- ${np}\n`;
    }
    systemPrompt += '\n';
  }

  // Add booking rules
  systemPrompt += `BOOKING RULES:\n`;
  systemPrompt += `- Minimum lead time: ${brain.booking_rules.min_lead_hours || 24} hours\n`;
  systemPrompt += `- Maximum advance booking: ${brain.booking_rules.max_advance_days || 30} days\n`;
  systemPrompt += `- Booking mode: ${brain.booking_rules.booking_mode === 'auto_book' ? 'Can confirm immediately' : 'Pending owner approval'}\n\n`;

  // Greeting and fallback
  if (brain.ai_settings?.greeting) {
    systemPrompt += `GREETING SCRIPT: "${brain.ai_settings.greeting}"\n`;
  }
  if (brain.ai_settings?.fallback) {
    systemPrompt += `FALLBACK (when unsure): "${brain.ai_settings.fallback}"\n`;
  }

  systemPrompt += `
CRITICAL RULES:
1. ONLY use information provided above. NEVER invent prices, services, or policies.
2. If you don't have the answer, say you'll have someone get back to them.
3. Be action-oriented: try to book, collect contact info, or provide clear next steps.
4. Keep responses concise and natural.
5. If the customer seems hesitant, address their concern directly.
`;

  // User prompt based on intent
  const userPrompt = `Customer message: "${userMessage}"
Intent detected: ${intent}

Generate a helpful, accurate response. ${channel === 'sms' ? 'Keep it under 300 characters.' : 'Be conversational.'}`;

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: channel === 'sms' ? 150 : 300,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    // Determine next action based on intent and reply
    let next_action = 'provide_info';
    if (intent === 'booking' && reply.toLowerCase().includes('time')) next_action = 'offer_slots';
    else if (intent === 'booking') next_action = 'request_details';
    else if (intent === 'urgent') next_action = 'callback';
    else if (reply.toLowerCase().includes('call you back') || reply.toLowerCase().includes('get back to you')) next_action = 'escalate';

    return { reply, next_action };
  } catch (error) {
    console.error("AI generation error:", error);
    return {
      reply: brain.ai_settings?.fallback || "I'd be happy to help! Let me have someone get back to you shortly.",
      next_action: 'escalate',
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body early to extract tenantId for validation
    const body = await req.json().catch(() => ({}));
    const { userMessage, channel = 'call', customerId } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "User message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate user has access to the requested tenant
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = serviceClient();

    // Get the authorization header to pass to sub-functions
    const authHeader = req.headers.get("authorization") || "";

    // Detect intent
    const intent = detectIntent(userMessage);

    // Fetch business brain (pass user's auth header for tenant validation)
    const brainResponse = await fetch(`${supabaseUrl}/functions/v1/build-business-brain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ tenantId }),
    });

    if (!brainResponse.ok) {
      throw new Error("Failed to fetch business brain");
    }

    const { brain } = await brainResponse.json();

    // Retrieve relevant knowledge (pass user's auth header for tenant validation)
    const knowledgeResponse = await fetch(`${supabaseUrl}/functions/v1/retrieve-knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ tenantId, queryText: userMessage, intent, topK: 8 }),
    });

    if (!knowledgeResponse.ok) {
      throw new Error("Failed to retrieve knowledge");
    }

    const { snippets, confidence } = await knowledgeResponse.json();

    // Build response plan
    const factsToUse = snippets.slice(0, 5).map((s: any) => ({
      source: s.source_type,
      content: s.content,
    }));

    const policyConstraints: string[] = [];
    if (brain.policies.cancellation) policyConstraints.push(`Cancellation: ${brain.policies.cancellation}`);
    if (brain.policies.deposit) policyConstraints.push(`Deposit: ${brain.policies.deposit}`);

    const guardrailsApplied = brain.guardrails.never_promise.slice(0, 3);

    // Determine what info to collect based on intent
    const requiredInfo: string[] = [];
    if (intent === 'booking') {
      requiredInfo.push('Preferred date/time', 'Service needed');
      if (brain.intake_fields.length > 0) {
        const required = brain.intake_fields.filter((f: any) => f.required);
        requiredInfo.push(...required.map((f: any) => f.label));
      }
    } else if (intent === 'quote') {
      requiredInfo.push('Service details', 'Any specific requirements');
    } else if (intent === 'cancel' || intent === 'reschedule') {
      requiredInfo.push('Booking reference or date');
    }

    // Generate the reply
    const { reply, next_action } = await generateReply(
      brain,
      snippets,
      userMessage,
      intent,
      channel,
      lovableApiKey
    );

    // Check for knowledge gap
    const knowledgeGapDetected = confidence === 'low' && intent !== 'greeting';
    let gapDescription: string | undefined;

    if (knowledgeGapDetected) {
      gapDescription = `No confident answer for: "${userMessage}" (intent: ${intent})`;
      
      // Log the knowledge gap
      await supabase.from('knowledge_gaps').upsert({
        tenant_id: tenantId,
        gap_type: intent === 'quote' ? 'missing_pricing' : 
                  intent === 'service_info' ? 'missing_faq' : 'unanswered_question',
        description: gapDescription,
        customer_question: userMessage,
        priority: intent === 'urgent' ? 3 : 2,
      }, {
        onConflict: 'id', // Will create new if no match
      });
    }

    const plan: ResponsePlan = {
      intent,
      confidence,
      required_info_to_collect: requiredInfo,
      facts_to_use: factsToUse,
      policy_constraints: policyConstraints,
      guardrails_applied: guardrailsApplied,
      next_action: next_action as any,
      draft_reply: reply,
      sources_used: snippets.slice(0, 5).map((s: any) => ({ type: s.source_type, id: s.id })),
      knowledge_gap_detected: knowledgeGapDetected,
      gap_description: gapDescription,
    };

    return new Response(
      JSON.stringify({ 
        plan,
        brain_summary: {
          business_name: brain.business.name,
          services_count: brain.services.length,
          faqs_count: brain.faqs.length,
          has_booking_rules: !!brain.booking_rules.min_lead_hours,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-plan-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
