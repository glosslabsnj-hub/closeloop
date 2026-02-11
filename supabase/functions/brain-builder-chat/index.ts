import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function buildSystemPrompt(
  businessMode: string,
  capabilities: Record<string, boolean>,
  currentTopic: string,
  completedTopics: string[]
): string {
  const isCallbackOnly = capabilities.aiBooksDirect === false;
  const isDispatch = businessMode === "dispatch";
  const isFood = businessMode === "food";
  const isMedical = businessMode === "medical";

  return `You are a friendly business setup assistant for CloseLoop, an AI receptionist platform. You're interviewing a business owner to configure their AI phone assistant.

BUSINESS MODE: ${businessMode}
CALLBACK ONLY: ${isCallbackOnly}
CAPABILITIES: ${JSON.stringify(capabilities)}
COMPLETED TOPICS: ${completedTopics.join(", ") || "none"}
CURRENT TOPIC: ${currentTopic}

YOUR GOAL: Ask conversational questions about "${currentTopic}" to extract structured data. Be warm, concise, and specific. Ask 1-3 questions at a time. When you have enough info for the current topic, set is_topic_complete=true.

TOPIC REQUIREMENTS:

**identity**: Extract business name, address, timezone, tagline.
- Ask: "What's your business name and where are you located?"
- Follow up for timezone if not obvious from location.
- Ask for a short tagline/description.

**hours**: Extract operating hours for each day of the week.
- Ask: "What are your business hours? Any days you're closed?"
- Clarify lunch breaks, weekend hours.
- Format: day_of_week (0=Sun..6=Sat), start_time "HH:MM", end_time "HH:MM"

**services**: Extract services offered with pricing.
- Ask: "What services do you offer? Give me a few of your main ones with rough pricing."
${isDispatch ? '- Focus on dispatch/towing services, vehicle types.' : ''}
${isFood ? '- Focus on menu categories and popular items.' : ''}
- Get: name, description, price_type (fixed/starting_at/quote_only), price_amount, duration_minutes

**policies**: Extract cancellation, deposit, and refund policies.
- Ask: "Do you require deposits? What's your cancellation policy?"
- Ask: "Is there anything your AI should NEVER promise to customers?"
${isMedical ? '- Ask about HIPAA compliance requirements.' : ''}

**ai_setup**: Extract greeting script, tone, and fallback behavior.
- Ask: "How should your AI greet callers? Formal, casual, friendly?"
- Ask: "If the AI can't help, what should it say?"
- Generate a natural greeting script and fallback script based on their answers.

**faqs**: Extract common customer questions and answers.
- Ask: "What are the most common questions customers ask you?"
- Ask: "What's something customers always get wrong or confused about?"
- Try to get at least 3-5 FAQ pairs.

RESPONSE FORMAT: You MUST respond with valid JSON only. No markdown, no explanation outside JSON.
{
  "message": "Your conversational response to the user",
  "extracted_data": [
    {
      "topic": "${currentTopic}",
      "action": "action_name",
      "data": { ... }
    }
  ],
  "current_topic": "${currentTopic}",
  "is_topic_complete": false,
  "is_all_complete": false
}

ACTIONS by topic:
- identity: "update_profile" with {name, tagline, address, timezone}
- hours: "upsert_hours" with {slots: [{day_of_week, start_time, end_time, is_available}]}
- services: "create_service" with {name, description, price_type, price_amount, duration_minutes}
- policies: "update_policies" with {cancellation_policy, deposit_policy, refund_policy}
- policies: "create_knowledge" with {type: "policy", title, content} for never-promise rules
- ai_setup: "update_ai_scripts" with {greeting_script, fallback_script, tone}
- faqs: "create_faq" with {question, answer}

RULES:
- Only extract data when the user has clearly provided it. Don't guess.
- extracted_data can be an empty array if you're still gathering info.
- When a topic is complete, set is_topic_complete=true and the next topic in current_topic.
- Topic order: identity → hours → services → policies → ai_setup → faqs
- When all topics are done, set is_all_complete=true.
- Keep responses SHORT and conversational. Max 2-3 sentences.
- If the user says something off-topic, gently redirect.
- NEVER output anything outside the JSON object.`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const ctx = await requireAuthedTenant(req);
    const { messages, current_topic, completed_topics, business_mode, capabilities } = await req.json();

    if (!LOVABLE_API_KEY) {
      return errorResponse("LOVABLE_API_KEY is not configured", 500);
    }

    const systemPrompt = buildSystemPrompt(
      business_mode || "service",
      capabilities || {},
      current_topic || "identity",
      completed_topics || []
    );

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limit exceeded, please try again in a moment.", 429);
      }
      if (response.status === 402) {
        return errorResponse("AI usage limit reached. Please add credits.", 402);
      }
      const text = await response.text();
      console.error("[brain-builder-chat] AI gateway error:", response.status, text);
      return errorResponse("AI service unavailable", 500);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON response from the AI
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[brain-builder-chat] Failed to parse AI response:", rawContent);
      // Return a fallback response
      parsed = {
        message: "I had a little trouble processing that. Could you rephrase your answer?",
        extracted_data: [],
        current_topic: current_topic || "identity",
        is_topic_complete: false,
        is_all_complete: false,
      };
    }

    return jsonResponse(parsed);
  } catch (err) {
    console.error("[brain-builder-chat] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Missing Authorization bearer token" || msg === "Unauthorized") {
      return errorResponse(msg, 401);
    }
    return errorResponse(msg, 500);
  }
});
