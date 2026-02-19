import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keys } = await req.json();
    if (!Array.isArray(keys)) {
      return new Response(JSON.stringify({ error: "keys must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which secrets exist (have a non-empty value)
    const found: string[] = [];
    for (const key of keys) {
      const val = Deno.env.get(key);
      if (val && val.trim().length > 0) {
        found.push(key);
      }
    }

    return new Response(JSON.stringify({ found }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin-check-secrets] Error:", err);
    return new Response(JSON.stringify({ found: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
