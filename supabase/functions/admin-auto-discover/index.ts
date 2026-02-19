import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[auto-discover] Starting discovery run");

    // Load settings
    const { data: settings } = await supabase
      .from("admin_growth_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_discovery_enabled) {
      console.log("[auto-discover] Auto discovery disabled");
      return jsonResponse({ success: true, reason: "disabled", discovered: 0 });
    }

    const industries = settings.discovery_industries || [];
    const locations = settings.discovery_locations || [];
    const maxPerRun = settings.discovery_max_per_run || 50;

    if (!industries.length || !locations.length) {
      console.log("[auto-discover] No industries or locations configured");
      return jsonResponse({ success: true, reason: "no_config", discovered: 0 });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return jsonResponse({ success: false, error: "PERPLEXITY_API_KEY not configured" }, 500);
    }

    let totalDiscovered = 0;
    let totalSaved = 0;
    let totalAutoEnrolled = 0;

    // Process each industry+location combo
    const perCombo = Math.max(3, Math.ceil(maxPerRun / (industries.length * locations.length)));

    for (const industry of industries) {
      for (const location of locations) {
        if (totalDiscovered >= maxPerRun) break;

        try {
          const leads = await searchLeads(PERPLEXITY_API_KEY, industry, location, perCombo);
          totalDiscovered += leads.length;

          // Save hot/warm leads
          const worthSaving = leads.filter((l: any) => {
            const score = scoreLead(l);
            return score >= 40; // warm threshold
          });

          if (worthSaving.length > 0) {
            const rows = worthSaving.map((l: any) => {
              const score = scoreLead(l);
              return {
                user_id: "00000000-0000-0000-0000-000000000000", // system user
                name: l.name,
                phone: l.phone || null,
                website: l.website || null,
                address: l.address || null,
                industry,
                rating: l.rating || null,
                review_count: l.review_count || null,
                employee_estimate: l.employee_estimate || null,
                hours: l.hours || null,
                reason: l.reason || null,
                friction_signals: l.friction_signals || [],
                confidence: l.confidence || "medium",
                score: score,
                temperature: score >= 70 ? "hot" : score >= 40 ? "warm" : "cold",
                score_reasons: l.friction_signals || [],
              };
            });

            const { data: saved } = await supabase
              .from("admin_saved_leads")
              .upsert(rows, { onConflict: "user_id,name,address", ignoreDuplicates: true })
              .select("id, name, phone, score, temperature");

            totalSaved += (saved ?? []).length;

            // Auto-enroll hot leads if outreach is enabled
            if (settings.auto_outreach_enabled) {
              const hotLeads = (saved ?? []).filter((s: any) => s.temperature === "hot");
              if (hotLeads.length > 0) {
                // Find default business campaign
                const { data: defaultCampaign } = await supabase
                  .from("admin_outreach_campaigns")
                  .select("id")
                  .eq("target_type", "business")
                  .eq("status", "active")
                  .order("created_at", { ascending: true })
                  .limit(1)
                  .maybeSingle();

                if (defaultCampaign) {
                  const enrollBody = {
                    campaign_id: defaultCampaign.id,
                    leads: hotLeads.map((l: any) => ({
                      lead_id: l.id,
                      lead_type: "business",
                      lead_name: l.name,
                      lead_phone: l.phone,
                    })),
                  };

                  await supabase.functions.invoke("admin-outreach-enroll", { body: enrollBody });
                  totalAutoEnrolled += hotLeads.length;
                }
              }
            }
          }
        } catch (err) {
          console.error(`[auto-discover] Error for ${industry} in ${location}:`, err);
        }
      }
    }

    // Log activity
    await supabase.from("admin_growth_activity_log").insert({
      activity_type: "discovery",
      title: `Auto-discovered ${totalDiscovered} leads, saved ${totalSaved}`,
      description: totalAutoEnrolled > 0 ? `${totalAutoEnrolled} hot leads auto-enrolled` : null,
      metadata: { totalDiscovered, totalSaved, totalAutoEnrolled, industries, locations },
    });

    console.log(`[auto-discover] Complete: ${totalDiscovered} found, ${totalSaved} saved, ${totalAutoEnrolled} enrolled`);

    return jsonResponse({
      success: true,
      discovered: totalDiscovered,
      saved: totalSaved,
      auto_enrolled: totalAutoEnrolled,
    });
  } catch (error) {
    console.error("[auto-discover] Fatal error:", error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});

async function searchLeads(apiKey: string, industry: string, location: string, count: number): Promise<any[]> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: `You are a B2B lead researcher. Find real local businesses matching the criteria. Return valid JSON array only, no markdown. Each object: {"name":"string","phone":"+1XXXXXXXXXX or null","website":"url or null","address":"string or null","rating":4.5,"review_count":123,"employee_estimate":"2-5","hours":"Mon-Fri 8am-5pm or null","reason":"2-3 sentence reason","friction_signals":["no_online_booking","small_team"],"confidence":"high|medium|low"}`,
        },
        {
          role: "user",
          content: `Find ${count} real ${industry} businesses in ${location} that need an AI phone receptionist. Focus on owner-operated, small teams, no online booking, high call volume, poor phone responsiveness.`,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.error("[auto-discover] Parse error:", e);
  }
  return [];
}

function scoreLead(lead: any): number {
  let score = 30;
  const signals = lead.friction_signals || [];

  if (signals.includes("no_online_booking")) score += 15;
  if (signals.includes("small_team")) score += 10;
  if (signals.includes("high_volume")) score += 15;
  if (signals.includes("after_hours_demand")) score += 10;
  if (signals.includes("growth_signals")) score += 10;
  if (signals.includes("poor_responsiveness")) score += 15;

  if (lead.rating && lead.rating >= 4.0 && lead.review_count >= 20) score += 5;
  if (lead.phone) score += 5;
  if (lead.website) score += 5;
  if (lead.confidence === "high") score += 5;

  return Math.min(100, score);
}
