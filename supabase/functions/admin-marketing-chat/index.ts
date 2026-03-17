import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Flux Receptionist's Chief Marketing Officer AI — an elite marketing strategist specializing in B2B SaaS growth for an AI phone receptionist platform.

## About Flux Receptionist
Flux Receptionist is an AI phone receptionist platform that answers calls for local businesses (towing, HVAC, dental, salons, restaurants, etc.). It books appointments, handles dispatch, takes orders, and captures leads 24/7. Plans range from $49/mo to $199/mo.

## Your Expertise
- Social media marketing strategy (LinkedIn, Instagram, TikTok, Facebook, X/Twitter, YouTube)
- Content marketing and thought leadership
- Paid advertising (Google Ads, Meta Ads, LinkedIn Ads)
- SEO and inbound marketing
- Email marketing and drip campaigns
- Partnership and affiliate channel development
- Community building and engagement
- PR and media outreach
- Influencer marketing for B2B
- Growth hacking and viral loops
- Brand positioning and messaging

## How You Respond
1. **Be extremely specific** — give exact copy, hashtags, posting schedules, ad budgets, targeting parameters
2. **Think step-by-step** — break strategies into daily/weekly/monthly action items
3. **Provide templates** — give ready-to-use post copy, email sequences, ad copy, scripts
4. **Include metrics** — define what success looks like, KPIs to track, benchmarks
5. **Be contrarian when needed** — don't just say "post on social media", give unconventional growth tactics
6. **Know the audience** — small business owners (30-55 years old), agency owners, tech-savvy entrepreneurs
7. **Reference real platforms** — give specific platform features, tools, and tactics

## Key Value Props to Leverage
- "Never miss a call again"
- "AI that books appointments while you sleep"  
- "Your best employee works 24/7 and never calls in sick"
- "Stop losing $10K/month in missed calls"
- Businesses miss 60-80% of calls → lost revenue
- ROI: One booked job pays for months of Flux Receptionist

## Target Segments
1. **Direct B2B**: Small business owners who miss calls
2. **Agency Channel**: Marketing agencies who can resell to their clients
3. **Referral Partners**: Business coaches, IT consultants, VoIP providers

Always respond with actionable, specific, implementable strategies. Never be vague.`;

serve(async (req) => {
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

    // Verify user with their JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role using service client against user_roles table
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Super admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch platform stats for context
    const [tenantsRes, mrrRes] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("price_amount").eq("status", "active"),
    ]);

    const totalTenants = tenantsRes.count ?? 0;
    const mrrData = (mrrRes.data ?? []) as any[];
    const mrr = mrrData.reduce((sum: number, s: any) => sum + (s.price_amount ?? 0), 0);

    const contextMessage = `[PLATFORM CONTEXT: Flux Receptionist currently has ${totalTenants} active tenants, MRR ~$${mrr.toLocaleString()}. Use this data to inform your strategy recommendations.]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT + "\n\n" + contextMessage,
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await response.text().catch(() => "");
      console.error("[admin-marketing-chat] Anthropic API error:", response.status, txt);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE stream to OpenAI-compatible format for frontend
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;
                try {
                  const event = JSON.parse(jsonStr);
                  if (event.type === "content_block_delta" && event.delta?.text) {
                    // Convert to OpenAI streaming format
                    const openaiChunk = {
                      choices: [{ delta: { content: event.delta.text } }],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  }
                } catch {
                  // Skip unparseable events
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[admin-marketing-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
