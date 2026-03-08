/**
 * Partner Analysis Edge Function
 *
 * Generates AI-powered business analysis for the Business Partner page.
 * Uses Claude Haiku 4.5 to analyze the tenant's actual business data
 * and produce personalized, contextual advice.
 *
 * - Caches analysis for 24 hours per tenant
 * - Manual refresh limited to 3 per day
 * - Auto-generates only when user visits and cache is expired
 *
 * Auth: JWT-based via requireAuthedTenant
 */

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { getBusinessBrainSnapshot } from "../_shared/getBusinessBrainSnapshot.ts";
import { getIndustryKnowledge } from "../_shared/industryKnowledge.ts";

const MAX_REFRESHES_PER_DAY = 3;

interface RequestBody {
  tenant_id: string;
  force_refresh?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const body: RequestBody = await req.json();
    const { tenantId } = await requireAuthedTenant(req, body.tenant_id);
    const forceRefresh = body.force_refresh === true;

    const supabase = serviceClient();

    // ─── Cache Check ────────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("partner_analyses")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (cached && !forceRefresh) {
      const expiresAt = new Date(cached.expires_at);
      if (expiresAt > now) {
        // Reset refresh count if new day
        const refreshCount = cached.refresh_date === today
          ? cached.refresh_count_today
          : 0;

        return jsonResponse({
          analysis: cached.analysis_json,
          generated_at: cached.generated_at,
          expires_at: cached.expires_at,
          is_cached: true,
          refresh_count_today: refreshCount,
          max_refreshes_per_day: MAX_REFRESHES_PER_DAY,
        });
      }
    }

    // ─── Rate Limit (force refresh only) ────────────────────────────
    if (forceRefresh && cached) {
      const refreshCount = cached.refresh_date === today
        ? cached.refresh_count_today
        : 0;

      if (refreshCount >= MAX_REFRESHES_PER_DAY) {
        return errorResponse(
          `Daily refresh limit reached (${MAX_REFRESHES_PER_DAY}/${MAX_REFRESHES_PER_DAY}). Analysis will auto-refresh tomorrow.`,
          429
        );
      }
    }

    // ─── Assemble Context (parallel) ────────────────────────────────
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[partner-analysis] Fetching brain snapshot for tenant: ${tenantId}`);
    let brainSnapshotResult;
    try {
      brainSnapshotResult = await getBusinessBrainSnapshot(supabase, { tenantId });
    } catch (snapErr: any) {
      console.error(`[partner-analysis] getBusinessBrainSnapshot failed:`, snapErr?.message, snapErr?.stack);
      return errorResponse(`Brain snapshot error: ${snapErr?.message || "unknown"}`, 500);
    }
    console.log(`[partner-analysis] Brain snapshot OK, fetching metrics...`);

    const brainSnapshot = brainSnapshotResult;

    const [
      callOutcomesResult,
      patternsResult,
      knowledgeGapsResult,
      insightsResult,
      digestResult,
      revenueResult,
      staffCountResult,
      calendarResult,
    ] = await Promise.all([
      supabase
        .from("call_outcomes")
        .select("outcome_type, intent, conversion_value_cents, ai_handled_fully, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("business_patterns")
        .select("pattern_type, pattern_key, confidence_score, observation_count, is_actionable, pattern_data")
        .eq("tenant_id", tenantId)
        .order("observation_count", { ascending: false })
        .limit(10),
      supabase
        .from("knowledge_gaps")
        .select("gap_type, description, customer_question, occurrence_count")
        .eq("tenant_id", tenantId)
        .eq("resolved", false)
        .order("occurrence_count", { ascending: false })
        .limit(10),
      supabase
        .from("intelligence_insights")
        .select("insight_type, severity, title, description, recommended_action, is_actioned")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("intelligence_digest")
        .select("digest_json, period_start, period_end")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("revenue_attributions")
        .select("entity_type, revenue_cents, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("tenant_users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabase
        .from("calendar_connections")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("status", "connected"),
    ]);

    // ─── Compute Metrics ────────────────────────────────────────────
    const callOutcomes = callOutcomesResult.data ?? [];
    const patterns = patternsResult.data ?? [];
    const knowledgeGaps = knowledgeGapsResult.data ?? [];
    const insights = insightsResult.data ?? [];
    const digest = digestResult.data;
    const revenueRows = revenueResult.data ?? [];
    const staffCount = staffCountResult.count ?? 0;
    const hasCalendarConnected = (calendarResult.data?.length ?? 0) > 0;

    const totalCalls = callOutcomes.length;
    const bookedCalls = callOutcomes.filter((c: any) => c.outcome_type === "booked").length;
    const conversionRate = totalCalls > 0 ? Math.round((bookedCalls / totalCalls) * 100) : 0;
    const hangupCalls = callOutcomes.filter((c: any) => c.outcome_type === "hangup" || c.outcome_type === "lost").length;
    const hangupRate = totalCalls > 0 ? Math.round((hangupCalls / totalCalls) * 100) : 0;
    const aiHandledFully = callOutcomes.filter((c: any) => c.ai_handled_fully).length;
    const aiHandledRate = totalCalls > 0 ? Math.round((aiHandledFully / totalCalls) * 100) : 0;
    const totalRevenueCents = revenueRows.reduce((sum: number, r: any) => sum + (r.revenue_cents || 0), 0);

    // Industry knowledge
    const industrySlug = brainSnapshot.tenant.industry || "";
    const industryEntry = getIndustryKnowledge(industrySlug);

    // Stage detection (same logic as frontend)
    const brainEssentialPct = computeBrainEssentialPct(brainSnapshot);
    const stage = detectStage(totalCalls, conversionRate, totalRevenueCents, brainEssentialPct);

    // ─── Build Context Document ─────────────────────────────────────
    const contextDoc = buildContextDocument({
      brainSnapshot,
      callOutcomes,
      patterns,
      knowledgeGaps,
      insights,
      digest,
      totalCalls,
      conversionRate,
      hangupRate,
      aiHandledRate,
      totalRevenueCents,
      stage,
      industryEntry,
      staffCount,
      hasCalendarConnected,
    });

    // ─── Call AI via Anthropic API ──────────────────────────────────
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.error("[partner-analysis] ANTHROPIC_API_KEY not configured");
      return errorResponse("ANTHROPIC_API_KEY not configured", 500);
    }
    console.log(`[partner-analysis] Calling Anthropic API (model: claude-haiku-4-5-20251001)...`);

    const systemPrompt = buildSystemPrompt();

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: contextDoc },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.error("[partner-analysis] Anthropic API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429);
      }
      return errorResponse(`AI service error: ${aiResponse.status}`, 502);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content?.[0]?.text ?? "";
    const promptTokens = aiData.usage?.input_tokens ?? null;
    const completionTokens = aiData.usage?.output_tokens ?? null;

    // Parse JSON from response (strip markdown fences if present)
    let analysis;
    try {
      const jsonStr = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[partner-analysis] Failed to parse AI response:", parseErr, rawText.substring(0, 500));
      return errorResponse("Failed to parse AI analysis response", 502);
    }

    // ─── Upsert Cache ──────────────────────────────────────────────
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const refreshCountToday = (cached && cached.refresh_date === today)
      ? cached.refresh_count_today + 1
      : 1;

    await supabase
      .from("partner_analyses")
      .upsert(
        {
          tenant_id: tenantId,
          analysis_json: analysis,
          model_used: "claude-haiku-4-5-20251001",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          generated_at: now.toISOString(),
          expires_at: expiresAt,
          refresh_count_today: refreshCountToday,
          refresh_date: today,
        },
        { onConflict: "tenant_id" }
      );

    return jsonResponse({
      analysis,
      generated_at: now.toISOString(),
      expires_at: expiresAt,
      is_cached: false,
      refresh_count_today: refreshCountToday,
      max_refreshes_per_day: MAX_REFRESHES_PER_DAY,
    });
  } catch (err: any) {
    console.error("[partner-analysis] Error:", err);

    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return errorResponse(err.message, 401);
    }

    return errorResponse(err.message || "Internal error", 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function detectStage(
  totalCalls: number,
  conversionRate: number,
  revenueCents: number,
  brainEssentialPct: number,
): string {
  if (totalCalls >= 200 && conversionRate > 40 && revenueCents > 500_000 && brainEssentialPct > 90)
    return "established";
  if (totalCalls >= 200 && conversionRate > 25 && revenueCents > 200_000)
    return "scaling";
  if (totalCalls >= 50 && brainEssentialPct > 80 && conversionRate > 15)
    return "growing";
  if (totalCalls >= 10 && brainEssentialPct > 50)
    return "building";
  return "getting_started";
}

function computeBrainEssentialPct(snapshot: any): number {
  let total = 0;
  let filled = 0;

  // Core fields
  const checks = [
    !!snapshot.tenant.name,
    Object.keys(snapshot.tenant.hours_json || {}).length > 0,
    snapshot._meta.section_counts.services > 0,
    !!snapshot.assistant_settings.ai_tone,
  ];
  total = checks.length;
  filled = checks.filter(Boolean).length;

  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

interface ContextInput {
  brainSnapshot: any;
  callOutcomes: any[];
  patterns: any[];
  knowledgeGaps: any[];
  insights: any[];
  digest: any;
  totalCalls: number;
  conversionRate: number;
  hangupRate: number;
  aiHandledRate: number;
  totalRevenueCents: number;
  stage: string;
  industryEntry: any;
  staffCount: number;
  hasCalendarConnected: boolean;
}

function buildContextDocument(ctx: ContextInput): string {
  const t = ctx.brainSnapshot.tenant;
  const counts = ctx.brainSnapshot._meta.section_counts;

  const sections: string[] = [];

  // Business identity
  sections.push(`=== BUSINESS PROFILE ===
Business Name: ${t.name || "Not set"}
Industry: ${t.industry || "Not specified"}
Business Mode: ${t.business_mode}
Address: ${t.address || "Not set"}
Timezone: ${t.timezone}
Years in Business: ${t.years_in_business ?? "Not set"}
Website: ${t.website_url || "Not set"}
Public Phone: ${t.phone_public || "Not set"}
Enabled Modules: ${t.enabled_modules.join(", ") || "None"}
HIPAA Mode: ${t.hipaa_mode ? "Yes" : "No"}`);

  // Hours
  const hoursStr = Object.keys(t.hours_json).length > 0
    ? Object.entries(t.hours_json).map(([day, h]: [string, any]) =>
        h.closed ? `${day}: Closed` : `${day}: ${h.open}-${h.close}`
      ).join(", ")
    : "Not configured";
  sections.push(`Business Hours: ${hoursStr}`);

  // Brain completion
  sections.push(`=== BRAIN SETUP STATUS ===
Services: ${counts.services}
FAQs: ${counts.faqs}
Objection Responses: ${counts.objections}
Knowledge Articles: ${counts.knowledge}
Intent Rules: ${counts.intent_rules}
Required Question Configs: ${counts.required_questions}
Pricing Rules: ${counts.pricing_rules}
Menu Items: ${counts.menu_items}
Mode-Specific Knowledge: ${counts.mode_knowledge}
AI Tone: ${ctx.brainSnapshot.assistant_settings.ai_tone || "Not set"}
AI Booking Mode: ${ctx.brainSnapshot.assistant_settings.ai_booking_mode}
Voice AI Enabled: ${ctx.brainSnapshot.assistant_settings.voice_ai_enabled}
Go-Live Enabled: ${ctx.brainSnapshot.assistant_settings.go_live_enabled}`);

  // Policies
  const policies: string[] = [];
  if (t.cancellation_policy) policies.push(`Cancellation: ${t.cancellation_policy}`);
  if (t.deposit_policy) policies.push(`Deposit: ${t.deposit_policy}`);
  if (t.refund_policy) policies.push(`Refund: ${t.refund_policy}`);
  if (t.payment_methods?.length > 0) policies.push(`Payment Methods: ${t.payment_methods.join(", ")}`);
  if (policies.length > 0) {
    sections.push(`=== POLICIES ===\n${policies.join("\n")}`);
  } else {
    sections.push(`=== POLICIES ===\nNo policies configured.`);
  }

  // Service area
  if (t.service_area_json) {
    const sa = t.service_area_json;
    sections.push(`=== SERVICE AREA ===
Type: ${sa.type || sa.mode || "Not specified"}
Radius: ${sa.radius_miles || sa.miles || "N/A"} miles
ZIP Codes: ${sa.zip_codes?.length ?? 0}`);
  }

  // Services list (with pricing gap flags)
  if (ctx.brainSnapshot.services.length > 0) {
    const svcList = ctx.brainSnapshot.services.slice(0, 20).map((s: any) => {
      const priceStr = s.price_amount ? `$${s.price_amount}` : "NO PRICE SET";
      const warning = !s.price_amount && s.price_type !== "quote_only" ? " ⚠" : "";
      return `- ${s.name} (${s.price_type}, ${priceStr}, ${s.duration_minutes}min)${warning}`;
    }).join("\n");
    sections.push(`=== SERVICES ===\n${svcList}`);
  }

  // Operational context
  sections.push(`=== OPERATIONAL CONTEXT ===
Staff Count: ${ctx.staffCount}
Calendar Connected: ${ctx.hasCalendarConnected ? "Yes" : "No"}
AI Booking Mode: ${ctx.brainSnapshot.assistant_settings.ai_booking_mode || "full_service"}`);


  // Performance metrics
  sections.push(`=== PERFORMANCE (Last 30 Days) ===
Total Calls: ${ctx.totalCalls}
Conversion Rate: ${ctx.conversionRate}%
Hangup/Lost Rate: ${ctx.hangupRate}%
AI Fully Handled Rate: ${ctx.aiHandledRate}%
Total Revenue: $${(ctx.totalRevenueCents / 100).toFixed(2)}
Business Stage: ${ctx.stage}`);

  // Call outcome breakdown
  if (ctx.callOutcomes.length > 0) {
    const outcomeMap: Record<string, number> = {};
    const intentMap: Record<string, number> = {};
    for (const c of ctx.callOutcomes) {
      outcomeMap[c.outcome_type] = (outcomeMap[c.outcome_type] || 0) + 1;
      if (c.intent) intentMap[c.intent] = (intentMap[c.intent] || 0) + 1;
    }
    sections.push(`=== CALL OUTCOME BREAKDOWN ===
${Object.entries(outcomeMap).map(([k, v]) => `${k}: ${v}`).join(", ")}
Intent Distribution: ${Object.entries(intentMap).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
  }

  // Business patterns
  if (ctx.patterns.length > 0) {
    const patternList = ctx.patterns.map((p: any) =>
      `- [${p.pattern_type}] ${p.pattern_key} (confidence: ${p.confidence_score}, observations: ${p.observation_count}${p.is_actionable ? ", ACTIONABLE" : ""})`
    ).join("\n");
    sections.push(`=== DETECTED PATTERNS ===\n${patternList}`);
  }

  // Knowledge gaps
  if (ctx.knowledgeGaps.length > 0) {
    const gapList = ctx.knowledgeGaps.map((g: any) =>
      `- [${g.gap_type}] "${g.customer_question || g.description}" (asked ${g.occurrence_count}x)`
    ).join("\n");
    sections.push(`=== KNOWLEDGE GAPS (Unresolved) ===\n${gapList}`);
  }

  // Intelligence insights
  if (ctx.insights.length > 0) {
    const insightList = ctx.insights.map((i: any) =>
      `- [${i.severity}] ${i.title}: ${i.description}${i.is_actioned ? " (actioned)" : ""}`
    ).join("\n");
    sections.push(`=== INTELLIGENCE INSIGHTS ===\n${insightList}`);
  }

  // Weekly digest summary
  if (ctx.digest?.digest_json) {
    sections.push(`=== LATEST WEEKLY DIGEST ===
Period: ${ctx.digest.period_start} to ${ctx.digest.period_end}
Data: ${JSON.stringify(ctx.digest.digest_json).substring(0, 1000)}`);
  }

  // Industry context
  if (ctx.industryEntry) {
    sections.push(`=== INDUSTRY KNOWLEDGE (${ctx.industryEntry.name}) ===
Category: ${ctx.industryEntry.category}
Tips: ${ctx.industryEntry.tips.join("; ")}
Typical Services: ${ctx.industryEntry.services.map((s: any) => s.name).join(", ")}`);
  }

  return sections.join("\n\n");
}

function buildSystemPrompt(): string {
  return `You are a seasoned business consultant specializing in small businesses that use AI phone automation (Flux Receptionist platform). You analyze real business data and produce structured, actionable reports.

## Your Role
- You are analyzing a REAL business with REAL data. Be specific — reference actual numbers, services, and patterns.
- Be honest: if something is bad, say so clearly. If something is great, celebrate it.
- Be actionable: every recommendation must have a concrete next step.
- Be industry-aware: tailor advice to the specific industry and business mode.
- Be stage-aware: a brand-new business needs different advice than an established one.
- Always reference the business by name. Instead of "your conversion rate", say "{business_name}'s conversion rate".
- Reference specific services by name when giving advice. Instead of "add pricing to your services", say "add pricing to Oil Change and Brake Inspection".

## Deep Link Reference (for action_link and fix_link fields)
Use these exact paths so the frontend can create clickable links:
- /app/business-brain — Business Brain (knowledge, FAQs, services)
- /app/business-brain?section=services — Services/Menu configuration
- /app/business-brain?section=faqs — FAQ management
- /app/business-brain?section=objections — Objection responses
- /app/business-brain?section=policies — Business policies
- /app/business-brain?section=hours — Business hours
- /app/settings — General settings
- /app/ai-assistant — AI voice settings, tone, greeting
- /app/integrations — Automations and workflows
- /app/bookings — Booking management
- /app/dispatch — Dispatch queue
- /app/orders — Order management
- /app/inbox — Calls and leads inbox
- /app/reports — Performance reports
- /app/go-live — Go-live checklist and subscription

## Industry Benchmarks (use for comparison)
- Good conversion rate: 30-50% (service), 40-60% (food), 25-40% (dispatch)
- Acceptable hangup rate: under 20%
- Good AI handled rate: over 70%
- Brain completion: 80%+ for reliable AI performance

## Output Format
You MUST respond with ONLY a valid JSON object (no markdown fences, no commentary). The JSON must match this exact schema:

{
  "executive_summary": {
    "headline": "string — one compelling sentence about the business state",
    "stage_assessment": "string — 1-2 sentences about where they are in their journey",
    "overall_grade": "A|B|C|D|F",
    "grade_reasoning": "string — 1-2 sentences explaining the grade"
  },
  "current_state": {
    "strengths": [{"title":"string","explanation":"string","evidence":"string"}],
    "weaknesses": [{"title":"string","explanation":"string","evidence":"string"}]
  },
  "problems": {
    "critical": [{"title":"string","explanation":"string","impact":"string","fix_action":"string","fix_link":"string"}],
    "warnings": [{"title":"string","explanation":"string","impact":"string","fix_action":"string","fix_link":"string"}]
  },
  "growth": {
    "quick_wins": [{"title":"string","explanation":"string","expected_impact":"string","effort_level":"low|medium|high","action_link":"string"}],
    "strategic_initiatives": [{"title":"string","explanation":"string","expected_impact":"string","effort_level":"low|medium|high","action_link":"string"}],
    "industry_specific": [{"title":"string","explanation":"string","expected_impact":"string","effort_level":"low|medium|high","action_link":"string"}]
  },
  "action_plan": {
    "this_week": [{"title":"string","description":"string","action_link":"string","priority":1}],
    "this_month": [{"title":"string","description":"string","action_link":"string","priority":1}],
    "this_quarter": [{"title":"string","description":"string","action_link":"string","priority":1}]
  },
  "industry_context": {
    "narrative": "string — 2-3 sentences of industry-specific context",
    "benchmarks": [{"metric":"string","your_value":"string","typical_range":"string","assessment":"above|on_track|below"}]
  },
  "_meta": {
    "business_name": "string",
    "business_mode": "string",
    "industry": "string",
    "stage": "string"
  }
}

Constraints:
- strengths: max 5 items
- weaknesses: max 5 items
- critical problems: max 3 items
- warnings: max 5 items
- quick_wins, strategic_initiatives, industry_specific: max 3 each
- this_week, this_month, this_quarter: max 3 each
- benchmarks: max 4 items
- If there's no data for a section, use an empty array []
- All fix_link and action_link values must be valid deep link paths from the reference table above
- Do NOT wrap the JSON in markdown code fences`;
}
