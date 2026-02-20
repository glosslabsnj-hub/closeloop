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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const {
      business_name,
      industry,
      business_mode,
      website_url,
      address,
      phone_extracted,
      hours_json,
      services_json,
      faqs_json,
      description,
      owner_type,
      agency_id,
    } = body;

    if (!business_name || !website_url) {
      return errorResponse("business_name and website_url are required");
    }

    const profileData = {
      owner_id: user.id,
      owner_type: owner_type || "admin",
      agency_id: agency_id || null,
      business_name,
      industry: industry || "general",
      business_mode: business_mode || "general",
      website_url,
      address: address || null,
      phone_extracted: phone_extracted || null,
      hours_json: hours_json || {},
      services_json: services_json || [],
      faqs_json: faqs_json || [],
      description: description || "",
      is_active: false,
    };

    // Insert the demo profile
    const { data: profile, error: insertErr } = await supabase
      .from("demo_profiles")
      .insert(profileData)
      .select()
      .single();

    if (insertErr) {
      console.error("[create-demo-profile] Insert error:", insertErr);
      return errorResponse(insertErr.message, 500);
    }

    // Auto-activate: deactivate all other profiles for this owner, activate this one
    await supabase
      .from("demo_profiles")
      .update({ is_active: false })
      .eq("owner_id", user.id)
      .neq("id", profile.id);

    await supabase
      .from("demo_profiles")
      .update({ is_active: true })
      .eq("id", profile.id);

    // Update demo_phone_numbers to point to this profile
    await supabase
      .from("demo_phone_numbers")
      .update({ active_demo_profile_id: profile.id })
      .eq("owner_id", user.id);

    console.log("[create-demo-profile] Created:", profile.id);

    return jsonResponse({ success: true, profile: { ...profile, is_active: true } });
  } catch (err) {
    console.error("[create-demo-profile] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
