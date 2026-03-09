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

interface KnowledgeSnippet {
  source_type: string;
  id: string;
  title: string;
  content: string;
  relevance_score: number;
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

// Simple keyword-based relevance scoring
function calculateRelevance(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textLower = text.toLowerCase();

  let score = 0;
  let exactMatches = 0;

  for (const word of queryWords) {
    if (textLower.includes(word)) {
      score += 1;
      if (new RegExp(`\\b${word}\\b`).test(textLower)) {
        exactMatches += 1;
      }
    }
  }

  const baseScore = queryWords.length > 0 ? score / queryWords.length : 0;
  const exactBonus = exactMatches * 0.1;
  return Math.min(baseScore + exactBonus, 1);
}

// Intent-based boosting
function getIntentBoost(intent: string, sourceType: string): number {
  const boosts: Record<string, Record<string, number>> = {
    booking: { service: 0.3, intake: 0.2 },
    quote: { service: 0.4, policy: 0.1 },
    service_info: { service: 0.4, faq: 0.2 },
    pricing: { service: 0.5 },
    cancel: { policy: 0.5 },
    reschedule: { policy: 0.3, service: 0.2 },
    hours: { faq: 0.3 },
    location: { faq: 0.3 },
    objection: { objection: 0.5 },
    urgent: { policy: 0.3 },
  };
  return boosts[intent]?.[sourceType] || 0;
}

// Retrieve relevant knowledge snippets directly from DB
function retrieveKnowledge(
  queryText: string,
  intent: string,
  faqs: any[],
  objections: any[],
  services: any[],
  knowledgeBase: any[],
  tenant: any,
  topK: number = 8,
): { snippets: KnowledgeSnippet[]; confidence: string } {
  const snippets: KnowledgeSnippet[] = [];

  for (const faq of faqs) {
    const searchText = `${faq.question} ${faq.answer}`;
    const baseScore = calculateRelevance(queryText, searchText);
    const intentBoost = getIntentBoost(intent, 'faq');
    const priorityBoost = (faq.priority_weight || 0) * 0.05;
    snippets.push({
      source_type: 'faq',
      id: faq.id,
      title: faq.question,
      content: faq.answer,
      relevance_score: baseScore + intentBoost + priorityBoost,
    });
  }

  for (const obj of objections) {
    const searchText = `${obj.objection} ${obj.response}`;
    const baseScore = calculateRelevance(queryText, searchText);
    const intentBoost = getIntentBoost(intent, 'objection');
    const priorityBoost = (obj.priority_weight || 0) * 0.05;
    snippets.push({
      source_type: 'objection',
      id: obj.id,
      title: obj.objection,
      content: obj.response,
      relevance_score: baseScore + intentBoost + priorityBoost,
    });
  }

  for (const svc of services) {
    // Include "service" keyword so generic queries ("what services do you offer?") always match
    const searchText = `${svc.name} service ${svc.description || ''} ${svc.preparation_instructions || ''}`;
    const baseScore = calculateRelevance(queryText, searchText);
    const intentBoost = getIntentBoost(intent, 'service');
    let content = `${svc.description || 'No description available'}`;
    if (svc.price_type === 'fixed' && svc.price_amount) {
      content += ` Price: $${svc.price_amount}.`;
    } else if (svc.price_type === 'starting_at' && svc.price_amount) {
      content += ` Starting at $${svc.price_amount}.`;
    } else {
      content += ` Price: Quote required.`;
    }
    content += ` Duration: ${svc.duration_minutes} minutes.`;
    if (svc.deposit_required && svc.deposit_amount) {
      content += ` Deposit: $${svc.deposit_amount} required.`;
    }
    snippets.push({
      source_type: 'service',
      id: svc.id,
      title: svc.name,
      content,
      relevance_score: baseScore + intentBoost,
    });
  }

  for (const kb of knowledgeBase) {
    const searchText = `${kb.title} ${kb.content}`;
    const baseScore = calculateRelevance(queryText, searchText);
    const intentBoost = getIntentBoost(intent, kb.type);
    const priorityBoost = (kb.priority_weight || 0) * 0.05;
    snippets.push({
      source_type: kb.type,
      id: kb.id,
      title: kb.title,
      content: kb.content,
      relevance_score: baseScore + intentBoost + priorityBoost,
    });
  }

  if (tenant?.cancellation_policy) {
    const score = calculateRelevance(queryText, `cancel cancellation policy ${tenant.cancellation_policy}`);
    snippets.push({
      source_type: 'policy',
      id: 'cancellation_policy',
      title: 'Cancellation Policy',
      content: tenant.cancellation_policy,
      relevance_score: score + getIntentBoost(intent, 'policy'),
    });
  }
  if (tenant?.deposit_policy) {
    const score = calculateRelevance(queryText, `deposit payment policy ${tenant.deposit_policy}`);
    snippets.push({
      source_type: 'policy',
      id: 'deposit_policy',
      title: 'Deposit Policy',
      content: tenant.deposit_policy,
      relevance_score: score + getIntentBoost(intent, 'policy'),
    });
  }

  // Auto-generate business hours snippet from hours_json
  if (tenant?.hours_json && typeof tenant.hours_json === 'object') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hoursLines: string[] = [];
    for (const dayName of dayNames) {
      const dayLower = dayName.toLowerCase();
      const dayIdx = dayNames.indexOf(dayName).toString();
      const dayData = tenant.hours_json[dayLower] || tenant.hours_json[dayName] || tenant.hours_json[dayIdx];
      if (!dayData) continue;
      if (dayData.closed) {
        hoursLines.push(`${dayName}: Closed`);
      } else if (dayData.windows && Array.isArray(dayData.windows) && dayData.windows.length > 0) {
        const windowStr = dayData.windows.map((w: any) => `${w.open} - ${w.close}`).join(', ');
        hoursLines.push(`${dayName}: ${windowStr}`);
      } else if (dayData.open && dayData.close) {
        hoursLines.push(`${dayName}: ${dayData.open} - ${dayData.close}`);
      }
    }
    if (hoursLines.length > 0) {
      const hoursContent = hoursLines.join('\n');
      const score = calculateRelevance(queryText, `business hours open close schedule when available ${hoursContent}`);
      snippets.push({
        source_type: 'faq',
        id: 'business_hours',
        title: 'Business Hours',
        content: hoursContent,
        relevance_score: score + getIntentBoost(intent, 'faq') + 0.2,
      });
    }
  }

  const rankedSnippets = snippets
    .filter(s => s.relevance_score > 0.1)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, topK);

  const topScore = rankedSnippets[0]?.relevance_score || 0;
  const confidence = topScore > 0.6 ? 'high' : topScore > 0.3 ? 'medium' : 'low';

  return { snippets: rankedSnippets, confidence };
}

// Generate draft reply using AI (Anthropic Claude API)
async function generateReply(
  brain: any,
  snippets: KnowledgeSnippet[],
  userMessage: string,
  intent: Intent,
  channel: string,
  allFaqs: any[],
  allObjections: any[],
  conversationHistory?: Array<{ role: string; content: string }>,
  tenantTimezone?: string,
): Promise<{ reply: string; next_action: string }> {

  // Build current date/time string in tenant's timezone
  const now = new Date();
  const tz = tenantTimezone || 'America/New_York';
  let currentDateTimeStr: string;
  try {
    currentDateTimeStr = now.toLocaleString('en-US', {
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
    currentDateTimeStr = now.toISOString();
  }

  // Build system prompt from brain
  let systemPrompt = `You are an AI assistant for ${brain.business.name}`;
  if (brain.business.tagline) systemPrompt += ` - ${brain.business.tagline}`;
  systemPrompt += `.

CURRENT DATE AND TIME: ${currentDateTimeStr} (${tz})

COMMUNICATION STYLE: Be ${brain.ai_settings?.tone || 'friendly'} in your responses.
CHANNEL: ${channel === 'sms' ? 'SMS (keep responses under 300 characters)' : 'Phone call (be conversational)'}

BUSINESS INFORMATION:
- Industry: ${brain.business.industry}
- Phone: ${brain.business.phone || 'Not provided'}
- Address: ${brain.business.address || 'Not provided'}

`;

  // Add business hours
  if (brain.hours && Object.keys(brain.hours).length > 0) {
    systemPrompt += `BUSINESS HOURS:\n`;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Support both named keys ("monday") and numbered keys ("0"-"6"), plus legacy/new formats
    for (const dayName of dayNames) {
      const dayLower = dayName.toLowerCase();
      const dayIndex = dayNames.indexOf(dayName).toString();
      const dayData = brain.hours[dayLower] || brain.hours[dayName] || brain.hours[dayIndex];
      if (!dayData) continue;
      if (dayData.closed) {
        systemPrompt += `- ${dayName}: CLOSED\n`;
      } else if (dayData.windows && Array.isArray(dayData.windows) && dayData.windows.length > 0) {
        const windowStr = dayData.windows.map((w: any) => `${w.open} - ${w.close}`).join(', ');
        systemPrompt += `- ${dayName}: ${windowStr}\n`;
      } else if (dayData.open && dayData.close) {
        systemPrompt += `- ${dayName}: ${dayData.open} - ${dayData.close}\n`;
      }
    }
    systemPrompt += '\n';
  }

  // Add ALL services (not just top 5 — businesses may have 10-20 services)
  if (brain.services.length > 0) {
    systemPrompt += `SERVICES OFFERED:\n`;
    for (const s of brain.services) {
      systemPrompt += `- ${s.name}`;
      if (s.price_type === 'fixed' && s.price_amount) systemPrompt += ` - $${s.price_amount}`;
      else if (s.price_type === 'starting_at' && s.price_amount) systemPrompt += ` - starting at $${s.price_amount}`;
      else systemPrompt += ` - quote required`;
      systemPrompt += ` (${s.duration_minutes} min)`;
      if (s.description) systemPrompt += ` — ${s.description}`;
      systemPrompt += `\n`;
    }
    systemPrompt += '\n';
  }

  // Add ALL FAQs so the AI can answer common questions
  if (allFaqs.length > 0) {
    systemPrompt += `FREQUENTLY ASKED QUESTIONS:\n`;
    for (const faq of allFaqs.slice(0, 15)) {
      systemPrompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }
  }

  // Add objection responses when customer pushback is detected
  if (allObjections.length > 0 && ['objection', 'cancel', 'other'].includes(intent)) {
    systemPrompt += `OBJECTION HANDLING:\n`;
    for (const obj of allObjections.slice(0, 5)) {
      systemPrompt += `If customer says: "${obj.objection}" → Respond: ${obj.response}\n`;
    }
    systemPrompt += '\n';
  }

  // Add query-specific knowledge snippets (exclude policies — promoted to POLICIES section below)
  const nonFaqNonServiceSnippets = snippets.filter(
    s => s.source_type !== 'faq' && s.source_type !== 'service' && s.source_type !== 'policy'
  );
  if (nonFaqNonServiceSnippets.length > 0) {
    systemPrompt += `ADDITIONAL KNOWLEDGE:\n`;
    for (const s of nonFaqNonServiceSnippets.slice(0, 5)) {
      systemPrompt += `[${s.source_type.toUpperCase()}] ${s.title}: ${s.content}\n\n`;
    }
  }

  // Add policies (tenant-level + all policy-type knowledge base entries)
  const policySnippets = snippets.filter(s => s.source_type === 'policy');
  const hasAnyPolicy = brain.policies.cancellation || brain.policies.deposit || brain.policies.refund || policySnippets.length > 0;
  if (hasAnyPolicy) {
    systemPrompt += `POLICIES (MUST FOLLOW — these are hard rules set by the business owner):\n`;
    if (brain.policies.cancellation) systemPrompt += `- Cancellation: ${brain.policies.cancellation}\n`;
    if (brain.policies.deposit) systemPrompt += `- Deposit: ${brain.policies.deposit}\n`;
    if (brain.policies.refund) systemPrompt += `- Refund: ${brain.policies.refund}\n`;
    for (const s of policySnippets) {
      systemPrompt += `- ${s.title}: ${s.content}\n`;
    }
    systemPrompt += '\n';
  }

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
  systemPrompt += `- Minimum lead time: ${brain.booking_rules.min_lead_hours || 2} hours\n`;
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

  // Build messages array with conversation history
  const messages: Array<{ role: string; content: string }> = [];

  if (conversationHistory && conversationHistory.length > 0) {
    // Include prior conversation turns (last 10 exchanges max)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      const role = msg.role === 'customer' || msg.role === 'user' ? 'user' : 'assistant';
      messages.push({ role, content: msg.content });
    }
  }

  // Add current user message
  const userPrompt = `Customer message: "${userMessage}"
Intent detected: ${intent}

Generate a helpful, accurate response. ${channel === 'sms' ? 'Keep it under 300 characters.' : 'Be conversational.'}`;
  messages.push({ role: "user", content: userPrompt });

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return {
      reply: brain.ai_settings?.fallback || "I'd be happy to help! Let me have someone get back to you shortly.",
      next_action: 'escalate',
    };
  }

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: channel === 'sms' ? 150 : 300,
        system: systemPrompt,
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => '');
      const isQuotaError = aiResponse.status === 429 || errText.includes('credit') || errText.includes('quota') || errText.includes('overloaded');
      if (isQuotaError) {
        return { reply: "I'm having a brief technical issue. Please try again in a moment.", next_action: 'error' as any };
      }
      throw new Error(`Anthropic API error: ${aiResponse.status} ${errText}`);
    }

    const data = await aiResponse.json();
    const reply = data.content?.[0]?.text?.trim() || '';

    // Determine next action based on intent — do NOT infer escalation from reply text
    // ("get back to you" is a normal fallback phrase, NOT an actual escalation action)
    let next_action = 'provide_info';
    if (intent === 'booking' && reply.toLowerCase().includes('time')) next_action = 'offer_slots';
    else if (intent === 'booking') next_action = 'request_details';
    else if (intent === 'urgent') next_action = 'callback';

    return { reply, next_action };
  } catch (error) {
    const errMsg = String(error);
    const isQuota = errMsg.includes('credit') || errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('overloaded');
    console.error("AI generation error:", error);
    return {
      reply: isQuota ? "I'm having a brief technical issue. Please try again in a moment." : (brain.ai_settings?.fallback || "I'd be happy to help! Let me have someone get back to you shortly."),
      next_action: (isQuota ? 'error' : 'escalate') as any,
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
    const { userMessage, channel = 'call', customerId, conversationHistory } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "User message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate user has access to the requested tenant
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabase = serviceClient();

    // Detect intent
    const intent = detectIntent(userMessage);

    // Fetch all data directly using service client (no function-to-function HTTP calls)
    const [
      tenantResult,
      servicesResult,
      faqsResult,
      objectionsResult,
      assistantResult,
      assistantSettingsResult,
      knowledgeBaseResult,
    ] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("objection_responses").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("ai_assistants").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("ai_knowledge_base").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
    ]);

    if (tenantResult.error || !tenantResult.data) {
      console.error("Tenant not found:", tenantResult.error);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = tenantResult.data;
    const services = servicesResult.data || [];
    const faqs = faqsResult.data || [];
    const objections = objectionsResult.data || [];
    const assistant = assistantResult.data;
    const assistantSettings = assistantSettingsResult.data;
    const knowledgeBase = knowledgeBaseResult.data || [];

    // Build a lightweight brain object for the AI prompt
    const brain = {
      business: {
        name: tenant.name,
        tagline: tenant.tagline,
        industry: tenant.industry,
        phone: tenant.phone_public,
        address: tenant.address,
      },
      hours: tenant.hours_json || {},
      services: services.map((s: any) => ({
        name: s.name,
        description: s.description,
        duration_minutes: s.duration_minutes,
        price_type: s.price_type,
        price_amount: s.price_amount,
        deposit_required: s.deposit_required,
        deposit_amount: s.deposit_amount,
      })),
      policies: {
        cancellation: tenant.cancellation_policy,
        deposit: tenant.deposit_policy,
        refund: tenant.refund_policy,
      },
      booking_rules: {
        min_lead_hours: tenant.min_lead_hours,
        max_advance_days: tenant.max_advance_days,
        booking_mode: assistantSettings?.ai_booking_mode || 'auto_book',
      },
      guardrails: {
        never_promise: tenant.ai_never_promise || [],
      },
      faqs: faqs.map((f: any) => ({
        question: f.question,
        answer: f.answer,
        priority: f.priority_weight || 0,
      })),
      intake_fields: Array.isArray(tenant.context_fields_json) ? tenant.context_fields_json : [],
      ai_settings: assistant ? {
        tone: assistant.tone,
        greeting: assistant.greeting_script,
        fallback: assistant.fallback_script,
      } : null,
    };

    // Retrieve knowledge directly (no HTTP call to retrieve-knowledge)
    const { snippets, confidence } = retrieveKnowledge(
      userMessage, intent, faqs, objections, services, knowledgeBase, tenant
    );

    // Build response plan
    const factsToUse = snippets.slice(0, 5).map((s) => ({
      source: s.source_type,
      content: s.content,
    }));

    const policyConstraints: string[] = [];
    if (brain.policies.cancellation) policyConstraints.push(`Cancellation: ${brain.policies.cancellation}`);
    if (brain.policies.deposit) policyConstraints.push(`Deposit: ${brain.policies.deposit}`);
    // Include all policy-type knowledge base entries as hard constraints
    const customPolicies = knowledgeBase.filter((k: any) => k.type === 'policy');
    for (const p of customPolicies) {
      policyConstraints.push(`${p.title}: ${p.content}`);
    }

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

    // Get tenant timezone for date/time injection
    const tenantTimezone = assistantSettings?.settings_json?.timezone || null;

    // Generate the reply — pass raw FAQs and objections so they're always in prompt
    const { reply, next_action } = await generateReply(
      brain,
      snippets,
      userMessage,
      intent,
      channel,
      faqs,
      objections,
      Array.isArray(conversationHistory) ? conversationHistory : undefined,
      tenantTimezone,
    );

    // Check for knowledge gap
    const knowledgeGapDetected = confidence === 'low' && intent !== 'greeting';
    let gapDescription: string | undefined;

    if (knowledgeGapDetected) {
      gapDescription = `No confident answer for: "${userMessage}" (intent: ${intent})`;

      // Log the knowledge gap (fire and forget)
      supabase.from('knowledge_gaps').upsert({
        tenant_id: tenantId,
        gap_type: intent === 'quote' ? 'missing_pricing' :
                  intent === 'service_info' ? 'missing_faq' : 'unanswered_question',
        description: gapDescription,
        customer_question: userMessage,
        priority: intent === 'urgent' ? 3 : 2,
      }, {
        onConflict: 'id',
      }).then(() => {}).catch((e: any) => console.warn("knowledge_gaps upsert failed:", e));
    }

    // Build comprehensive sources list: always-injected + keyword-matched
    const allSourcesUsed: Array<{ type: string; id: string }> = [];
    for (const s of services.slice(0, 20)) {
      allSourcesUsed.push({ type: 'service', id: s.id });
    }
    for (const f of faqs.slice(0, 15)) {
      allSourcesUsed.push({ type: 'faq', id: f.id });
    }
    // Add keyword-matched snippets that aren't already included
    for (const s of snippets.slice(0, 5)) {
      if (!allSourcesUsed.find(src => src.id === s.id)) {
        allSourcesUsed.push({ type: s.source_type, id: s.id });
      }
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
      sources_used: allSourcesUsed,
      knowledge_gap_detected: knowledgeGapDetected,
      gap_description: gapDescription,
    };

    return new Response(
      JSON.stringify({
        plan,
        brain_summary: {
          business_name: brain.business.name,
          services_count: brain.services.length,
          faqs_count: faqs.length,
          objections_count: objections.length,
          has_booking_rules: !!brain.booking_rules.min_lead_hours,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error("Error in ai-plan-response:", errMsg, errStack);
    const isAuthError = /unauthorized|invalid.*jwt|jwt.*expired|not.*member|no.*authorization/i.test(errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: isAuthError ? 401 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
