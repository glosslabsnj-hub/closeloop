import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { full_name, email, company_name, expected_clients, phone, company_website, current_client_count, services_offered, referral_source, message, user_id } = body;

    // Validate required fields
    if (!full_name?.trim()) return errorResponse("Full name is required");
    if (!email?.trim()) return errorResponse("Email is required");
    if (!company_name?.trim()) return errorResponse("Company name is required");
    if (!expected_clients) return errorResponse("Expected clients is required");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return errorResponse("Invalid email format");

    const db = serviceClient();

    // Check for duplicate pending application
    const { data: existing } = await db
      .from("agency_applications")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .in("status", ["new", "reviewing"])
      .limit(1);

    if (existing && existing.length > 0) {
      return errorResponse("An application with this email is already under review", 409);
    }

    // Insert application
    const { error: insertErr } = await db
      .from("agency_applications")
      .insert({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company_name: company_name.trim(),
        company_website: company_website?.trim() || null,
        expected_clients: Number(expected_clients),
        current_client_count: current_client_count ? Number(current_client_count) : null,
        services_offered: services_offered || [],
        referral_source: referral_source?.trim() || null,
        message: message?.trim() || null,
        user_id: user_id || null,
      });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return errorResponse("Failed to submit application", 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("submit-agency-application error:", err);
    return errorResponse("Internal server error", 500);
  }
});
