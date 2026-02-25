import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

const PLATFORM_SPECS: Record<string, string> = {
  google: `Generate Google Ads copy with:
- 5+ headlines (max 30 characters each)
- 3+ descriptions (max 90 characters each)
- 10+ keyword suggestions
- Suggested CTA
Format: {"name":"campaign name","headlines":["..."],"descriptions":["..."],"keywords":["..."],"cta":"...","targeting":{"audience":"...","bid_strategy":"..."}}`,

  meta: `Generate Meta (Facebook/Instagram) ad copy with:
- 3+ primary text variations (125 chars optimal)
- 3+ headlines (40 chars optimal)
- 3+ descriptions (30 chars optimal)
- Suggested CTA button text
Format: {"name":"campaign name","headlines":["..."],"descriptions":["..."],"keywords":[],"cta":"...","targeting":{"audience":"...","placement":"...","objective":"..."}}`,

  linkedin: `Generate LinkedIn ad copy with:
- 3+ intro text variations (150 chars for sponsored content)
- 3+ headlines (70 chars max)
- 3+ descriptions (100 chars max)
- Suggested CTA
Format: {"name":"campaign name","headlines":["..."],"descriptions":["..."],"keywords":[],"cta":"...","targeting":{"audience":"...","job_titles":"...","company_size":"..."}}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !user) return errorResponse("Unauthorized", 401);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!roleData) return errorResponse("Forbidden", 403);
    }

    const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!apiKey) return errorResponse("AI_GATEWAY_API_KEY not configured", 500);

    const body = await req.json();
    const { platform, industry, location, objective } = body;

    if (!platform || !industry || !location || !objective) {
      return errorResponse("platform, industry, location, and objective required", 400);
    }

    const platformSpec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.google;

    const res = await fetch("https://ai.gateway.lovable.dev/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert digital advertising copywriter. You create high-converting ad copy for Flux Receptionist, an AI phone receptionist SaaS. Flux Receptionist answers business calls 24/7 with AI, books appointments, captures leads, and handles inquiries. It's designed for small-to-medium service businesses.`,
          },
          {
            role: "user",
            content: `Create ${platform} ad copy for targeting ${industry} businesses in ${location}. Objective: ${objective}.\n\n${platformSpec}\n\nReturn ONLY valid JSON, no markdown.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[ad-copy] AI error:", errText);
      return errorResponse("AI generation failed", 500);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    let parsed: any = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[ad-copy] Parse error:", e);
      return errorResponse("Failed to parse AI response", 500);
    }

    // Save to database
    const campaign = {
      name: parsed.name || `${platform} - ${industry} - ${location}`,
      platform,
      industry,
      location,
      objective,
      status: "draft",
      headlines: parsed.headlines || [],
      descriptions: parsed.descriptions || [],
      keywords: parsed.keywords || [],
      targeting: parsed.targeting || {},
      cta: parsed.cta || null,
      performance_metrics: {},
    };

    const { data: saved, error: saveErr } = await supabase
      .from("admin_ad_campaigns")
      .insert(campaign)
      .select()
      .single();

    if (saveErr) {
      console.error("[ad-copy] Save error:", saveErr);
      return errorResponse(saveErr.message, 500);
    }

    // Log activity
    await supabase.from("admin_growth_activity_log").insert({
      activity_type: "ad_created",
      title: `Ad campaign generated: ${campaign.name}`,
      description: `${platform} ads for ${industry} in ${location}`,
      metadata: { campaign_id: saved.id, platform, industry, location, objective },
    });

    return jsonResponse(saved);
  } catch (error) {
    console.error("[ad-copy] Error:", error);
    return errorResponse(String(error), 500);
  }
});
