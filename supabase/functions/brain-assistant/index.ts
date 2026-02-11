/**
 * Brain Assistant Edge Function
 *
 * Conversational AI assistant that helps business owners configure their
 * Business Brain. Uses Claude Sonnet to analyze the current Brain state,
 * suggest improvements, and propose specific write actions.
 *
 * Auth: JWT-based via requireAuthedTenant
 * Model: Claude Sonnet 4.5 via Anthropic API
 */

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { getBusinessBrainSnapshot, type BusinessBrainSnapshot } from "../_shared/getBusinessBrainSnapshot.ts";
import { buildBrainAssistantSystemPrompt, type EssentialGap } from "../_shared/brainAssistantPrompt.ts";
import { getIndustryKnowledge } from "../_shared/industryKnowledge.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BrainAction {
  id: string;
  type: string;
  description: string;
  data: Record<string, unknown>;
  preview?: string;
  requiresApproval: true;
}

interface RequestBody {
  tenant_id: string;
  messages: ChatMessage[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    // Auth
    const body: RequestBody = await req.json();
    const { tenantId } = await requireAuthedTenant(req, body.tenant_id);

    const { messages } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse("messages array is required");
    }

    // Rate limiting: max 50 messages per tenant per day
    // NOTE: Requires brain_assistant_usage table. If table doesn't exist,
    // rate limiting is skipped gracefully.
    const supabase = serviceClient();
    const today = new Date().toISOString().split("T")[0];
    let currentCount = 0;

    try {
      const { data: usageRow } = await supabase
        .from("brain_assistant_usage")
        .select("message_count")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .maybeSingle();

      currentCount = usageRow?.message_count ?? 0;
      if (currentCount >= 50) {
        return errorResponse("Daily message limit reached. Please try again tomorrow.", 429);
      }
    } catch (e) {
      // Table may not exist yet — skip rate limiting
      console.warn("[brain-assistant] Rate limiting skipped:", e);
    }

    // Fetch Brain snapshot
    const brainSnapshot = await getBusinessBrainSnapshot(supabase, { tenantId });

    // Look up industry knowledge
    const industrySlug = brainSnapshot.tenant.industry || "";
    const industryEntry = getIndustryKnowledge(industrySlug);

    // Compute essential gaps from snapshot
    const essentialGaps = computeEssentialGaps(brainSnapshot);

    // Build system prompt
    const systemPrompt = buildBrainAssistantSystemPrompt(
      brainSnapshot,
      industryEntry,
      essentialGaps,
    );

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse("LOVABLE_API_KEY not configured", 500);
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[brain-assistant] AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again in a moment.", 429);
      }
      if (aiResponse.status === 402) {
        return errorResponse("AI credits exhausted. Please add credits to your workspace.", 402);
      }
      return errorResponse(`AI service error: ${aiResponse.status}`, 502);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content ?? "";

    // Parse actions from the response
    const actions = parseActionsFromResponse(assistantMessage);

    // Strip action blocks from the message for clean display
    const cleanMessage = assistantMessage
      .replace(/```brain_action\n[\s\S]*?```/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Update usage counter (upsert) — graceful if table doesn't exist
    try {
      await supabase
        .from("brain_assistant_usage")
        .upsert(
          {
            tenant_id: tenantId,
            date: today,
            message_count: currentCount + 1,
            actions_proposed: actions.length,
          },
          { onConflict: "tenant_id,date" }
        );
    } catch (e) {
      console.warn("[brain-assistant] Usage tracking skipped:", e);
    }

    return jsonResponse({
      message: cleanMessage,
      actions,
      usage: {
        messages_today: currentCount + 1,
        limit: 50,
      },
    });
  } catch (err: any) {
    console.error("[brain-assistant] Error:", err);

    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return errorResponse(err.message, 401);
    }

    return errorResponse(err.message || "Internal error", 500);
  }
});

/**
 * Parse brain_action blocks from the AI response text.
 */
function parseActionsFromResponse(text: string): BrainAction[] {
  const actions: BrainAction[] = [];
  const regex = /```brain_action\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      actions.push({
        id: crypto.randomUUID(),
        type: parsed.type,
        description: parsed.description || "",
        data: parsed.data || {},
        preview: parsed.preview || "",
        requiresApproval: true,
      });
    } catch (e) {
      console.warn("[brain-assistant] Failed to parse action block:", e);
    }
  }

  return actions;
}

/**
 * Compute essential gaps from the brain snapshot.
 * Lightweight version of the frontend's useBrainCompletion logic.
 */
function computeEssentialGaps(snapshot: BusinessBrainSnapshot): EssentialGap[] {
  const gaps: EssentialGap[] = [];
  const t = snapshot.tenant;
  const counts = snapshot._meta.section_counts;

  // Required fields
  if (!t.name) {
    gaps.push({ fieldId: "business_name", label: "Business Name", priority: "required", section: "business" });
  }
  if (Object.keys(t.hours_json).length === 0) {
    gaps.push({ fieldId: "hours", label: "Business Hours", priority: "required", section: "business" });
  }
  if (counts.services === 0) {
    gaps.push({ fieldId: "services", label: "Services / Menu", priority: "required", section: "services" });
  }
  if (!snapshot.assistant_settings.ai_tone) {
    gaps.push({ fieldId: "greeting_script", label: "AI Greeting / Tone", priority: "required", section: "ai-voice" });
  }

  // Recommended fields
  if (!t.address) {
    gaps.push({ fieldId: "address", label: "Business Address", priority: "recommended", section: "business" });
  }
  if (!t.cancellation_policy) {
    gaps.push({ fieldId: "cancellation_policy", label: "Cancellation Policy", priority: "recommended", section: "operations" });
  }
  if (counts.faqs === 0) {
    gaps.push({ fieldId: "faqs", label: "FAQs", priority: "recommended", section: "training" });
  }
  if (counts.objections === 0) {
    gaps.push({ fieldId: "objections", label: "Objection Responses", priority: "recommended", section: "training" });
  }

  // Mode-specific
  const mode = t.business_mode;
  if ((mode === "dispatch" || t.enabled_modules.includes("dispatch_queue")) && !t.service_area_json) {
    gaps.push({ fieldId: "service_area", label: "Service Area", priority: "required", section: "operations" });
  }
  if (mode === "food" && counts.menu_items === 0) {
    gaps.push({ fieldId: "menu_items", label: "Menu Items", priority: "required", section: "services" });
  }

  return gaps;
}
