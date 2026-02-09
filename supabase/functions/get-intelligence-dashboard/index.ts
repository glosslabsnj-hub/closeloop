/**
 * get-intelligence-dashboard
 * 
 * API endpoint that returns aggregated intelligence data for the UI.
 * Includes metrics, active insights, top patterns, and AI health score.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant ID from request body or query
    const url = new URL(req.url);
    let tenantId = url.searchParams.get("tenant_id");
    
    if (!tenantId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      tenantId = body.tenantId;
    }

    if (!tenantId) {
      // Get user's primary tenant
      const { data: tenantUser } = await userClient
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      
      tenantId = tenantUser?.tenant_id;
    }

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time ranges
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get call outcomes for metrics
    const { data: outcomes } = await supabase
      .from("call_outcomes")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", last7Days);

    const outcomesList = outcomes || [];
    const totalCalls = outcomesList.length;
    const aiHandledCalls = outcomesList.filter(o => o.ai_handled_fully).length;
    const conversions = outcomesList.filter(o => 
      ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
    ).length;

    // AI Health Score (0-100)
    const aiHealthScore = totalCalls > 0 
      ? Math.round((aiHandledCalls / totalCalls) * 100)
      : 100; // Default to 100 if no calls

    // Get active insights
    const { data: insights } = await supabase
      .from("intelligence_insights")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_actioned", false)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    const unreadCount = (insights || []).filter(i => !i.is_read).length;

    // Get top patterns
    const { data: patterns } = await supabase
      .from("business_patterns")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_dismissed", false)
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false })
      .limit(5);

    // Get recent knowledge gaps
    const { data: gaps } = await supabase
      .from("knowledge_gaps")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(5);

    // Get latest digest
    const { data: digest } = await supabase
      .from("intelligence_digest")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("digest_type", "weekly")
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build response
    const response = {
      metrics: {
        period: "last_7_days",
        totalCalls,
        aiHandledCalls,
        aiHealthScore,
        conversions,
        conversionRate: totalCalls > 0 ? (conversions / totalCalls) : 0,
      },
      insights: {
        items: insights || [],
        unreadCount,
        totalActive: (insights || []).length,
      },
      patterns: patterns || [],
      gaps: gaps || [],
      latestDigest: digest,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[get-intelligence-dashboard] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
