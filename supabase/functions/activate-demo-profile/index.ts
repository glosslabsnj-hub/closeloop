import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return errorResponse("Unauthorized", 401);

    const { profile_id } = await req.json();
    if (!profile_id) return errorResponse("profile_id is required");

    // Verify ownership
    const { data: profile } = await supabase
      .from("demo_profiles")
      .select("id, owner_id")
      .eq("id", profile_id)
      .single();

    if (!profile || profile.owner_id !== user.id) {
      return errorResponse("Profile not found", 404);
    }

    // Deactivate all, activate target
    await supabase
      .from("demo_profiles")
      .update({ is_active: false })
      .eq("owner_id", user.id);

    await supabase
      .from("demo_profiles")
      .update({ is_active: true })
      .eq("id", profile_id);

    // Update demo phone number pointer
    await supabase
      .from("demo_phone_numbers")
      .update({ active_demo_profile_id: profile_id })
      .eq("owner_id", user.id);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[activate-demo-profile] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
