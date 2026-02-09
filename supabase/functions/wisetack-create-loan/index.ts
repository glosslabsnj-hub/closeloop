import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

// Wisetack API configuration
const WISETACK_API_BASE = Deno.env.get("WISETACK_API_BASE") || "https://sandbox-api.wisetack.com";

interface WisetackLoanRequest {
  tenant_id: string;
  customer_id?: string;
  estimate_id?: string;
  booking_id?: string;
  amount_cents: number;
  customer_email: string;
  customer_phone?: string;
  customer_name?: string;
  description?: string;
  redirect_url?: string;
}

interface WisetackConnection {
  access_token_encrypted: string;
  settings: {
    merchant_id: string;
    sandbox_mode?: boolean;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { tenantId } = await requireAuthedTenant(req);

    // Get request body
    const body: Partial<WisetackLoanRequest> = await req.json();

    if (!body.amount_cents || body.amount_cents < 500) {
      return errorResponse("Amount must be at least $5.00", 400);
    }

    if (!body.customer_email) {
      return errorResponse("Customer email is required", 400);
    }

    const supabase = serviceClient();

    // Get Wisetack connection
    const { data: connection, error: connError } = await supabase
      .from("integration_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("integration_type", "wisetack")
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return errorResponse("Wisetack not connected. Please connect in Integrations settings.", 400);
    }

    const wisetackConfig = connection as unknown as WisetackConnection;
    const apiKey = wisetackConfig.access_token_encrypted;
    const merchantId = wisetackConfig.settings?.merchant_id;

    if (!apiKey || !merchantId) {
      return errorResponse("Wisetack configuration incomplete", 400);
    }

    // Create loan application via Wisetack API
    // See: https://developers.wisetack.com/docs/api-reference
    const loanResponse = await fetch(`${WISETACK_API_BASE}/v1/loan-applications`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Wisetack-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        merchantId: merchantId,
        transactionAmount: body.amount_cents / 100, // Wisetack uses dollars
        consumer: {
          email: body.customer_email,
          phone: body.customer_phone || undefined,
          firstName: body.customer_name?.split(" ")[0] || undefined,
          lastName: body.customer_name?.split(" ").slice(1).join(" ") || undefined,
        },
        purchaseDescription: body.description || "Service",
        redirectUrl: body.redirect_url || undefined,
        metadata: {
          tenant_id: tenantId,
          estimate_id: body.estimate_id || undefined,
          booking_id: body.booking_id || undefined,
          customer_id: body.customer_id || undefined,
        },
      }),
    });

    if (!loanResponse.ok) {
      const errorData = await loanResponse.text();
      console.error("Wisetack API error:", errorData);

      // Update connection status to error if auth fails
      if (loanResponse.status === 401 || loanResponse.status === 403) {
        await supabase
          .from("integration_connections")
          .update({
            status: "error",
            last_error: "Authentication failed",
            last_error_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("integration_type", "wisetack");
      }

      return errorResponse("Failed to create financing application", 500);
    }

    const loanData = await loanResponse.json();
    /*
      Expected response:
      {
        id: "loan_123",
        applicationUrl: "https://app.wisetack.com/apply/...",
        status: "pending",
        ...
      }
    */

    // Store loan reference if we have an estimate
    if (body.estimate_id) {
      await supabase
        .from("estimates")
        .update({
          internal_notes: `Financing offered via Wisetack. Application ID: ${loanData.id}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.estimate_id);
    }

    return jsonResponse({
      success: true,
      loan_id: loanData.id,
      application_url: loanData.applicationUrl,
      status: loanData.status,
    });
  } catch (error: unknown) {
    console.error("Error in wisetack-create-loan:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
