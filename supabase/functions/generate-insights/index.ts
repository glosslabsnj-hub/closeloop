/**
 * generate-insights
 * 
 * Cron job (runs daily) that synthesizes patterns and knowledge gaps
 * into actionable insights using Lovable AI.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedInsight {
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommended_action: string;
  action_link?: string;
  impact_estimate: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, business_mode")
      .not("onboarding_completed_at", "is", null);

    if (tenantsError) throw tenantsError;

    const results: { tenantId: string; insightsGenerated: number }[] = [];

    for (const tenant of tenants || []) {
      // Get high-confidence patterns not yet converted to insights
      const { data: patterns } = await supabase
        .from("business_patterns")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_dismissed", false)
        .eq("is_actionable", true)
        .gte("confidence_score", 0.7)
        .order("confidence_score", { ascending: false })
        .limit(5);

      // Get unresolved knowledge gaps with high occurrence
      const { data: gaps } = await supabase
        .from("knowledge_gaps")
        .select("id, question_theme, sample_questions, occurrence_count")
        .eq("tenant_id", tenant.id)
        .eq("is_resolved", false)
        .gte("occurrence_count", 3)
        .order("occurrence_count", { ascending: false })
        .limit(5);

      if ((!patterns || patterns.length === 0) && (!gaps || gaps.length === 0)) {
        results.push({ tenantId: tenant.id, insightsGenerated: 0 });
        continue;
      }

      let insights: GeneratedInsight[] = [];

      // If Lovable AI is available, use it to synthesize insights
      if (lovableApiKey) {
        try {
          const prompt = `You are a business analyst for a ${tenant.business_mode} business called "${tenant.name}".

Based on these detected patterns:
${JSON.stringify(patterns?.map(p => ({ type: p.pattern_type, description: p.description, confidence: p.confidence_score })) || [], null, 2)}

And these knowledge gaps (questions the AI couldn't answer):
${JSON.stringify(gaps?.map(g => ({ theme: g.question_theme, occurrences: g.occurrence_count })) || [], null, 2)}

Generate 1-3 actionable insights. For each insight, provide:
1. A clear, non-technical title (max 10 words)
2. A brief description explaining why this matters (max 30 words)
3. A specific action the business owner can take (max 20 words)
4. Impact estimate: "low", "medium", or "high"
5. Severity: "info", "warning", or "critical"
6. insight_type: one of "knowledge_gap", "upsell_opportunity", "capacity_warning", "conversion_drop", "time_opportunity", "service_recommendation", "policy_needed"

Return a JSON array of insights.`;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a business intelligence analyst. Return only valid JSON arrays." },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || "";
            
            // Extract JSON from response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              insights = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (aiError) {
          console.error(`[generate-insights] AI error for ${tenant.id}:`, aiError);
        }
      }

      // Fallback: Create rule-based insights if AI didn't work
      if (insights.length === 0) {
        // Create insights from patterns
        for (const pattern of patterns || []) {
          if (pattern.suggested_action) {
            insights.push({
              insight_type: pattern.pattern_type === "conversion_pattern" ? "conversion_drop" : 
                           pattern.pattern_type === "objection_pattern" ? "knowledge_gap" : "service_recommendation",
              severity: pattern.confidence_score >= 0.8 ? "warning" : "info",
              title: pattern.description.slice(0, 60),
              description: pattern.description,
              recommended_action: pattern.suggested_action,
              action_link: pattern.pattern_type === "objection_pattern" ? "/app/business-brain?section=training" : undefined,
              impact_estimate: pattern.confidence_score >= 0.85 ? "high" : "medium",
            });
          }
        }

        // Create insights from knowledge gaps
        if (gaps && gaps.length > 0) {
          const topGap = gaps[0];
          insights.push({
            insight_type: "knowledge_gap",
            severity: topGap.occurrence_count >= 5 ? "warning" : "info",
            title: `Customers keep asking about "${topGap.question_theme}"`,
            description: `This question has come up ${topGap.occurrence_count} times and your AI couldn't answer it.`,
            recommended_action: "Add an FAQ or policy to address this topic",
            action_link: "/app/business-brain?section=training#gaps",
            impact_estimate: topGap.occurrence_count >= 5 ? "high" : "medium",
          });
        }
      }

      // Insert insights (skip duplicates by checking existing titles)
      let insertedCount = 0;
      for (const insight of insights) {
        // Check if similar insight already exists and is unactioned
        const { data: existing } = await supabase
          .from("intelligence_insights")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("title", insight.title)
          .eq("is_actioned", false)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase
            .from("intelligence_insights")
            .insert({
              tenant_id: tenant.id,
              insight_type: insight.insight_type,
              severity: insight.severity,
              title: insight.title,
              description: insight.description,
              recommended_action: insight.recommended_action,
              action_link: insight.action_link,
              impact_estimate: insight.impact_estimate,
              expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            });

          if (!insertError) insertedCount++;
        }
      }

      results.push({ tenantId: tenant.id, insightsGenerated: insertedCount });
    }

    console.log(`[generate-insights] Processed ${results.length} tenants`);

    return new Response(JSON.stringify({ 
      success: true, 
      tenantsProcessed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-insights] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
