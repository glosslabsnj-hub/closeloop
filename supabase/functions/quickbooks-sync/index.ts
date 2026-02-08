import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

// QuickBooks OAuth configuration
const QB_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID");
const QB_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");

interface QuickBooksConnection {
  tenant_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string | null;
  external_account_id: string; // realm_id
  settings: {
    realm_id: string;
    sync_customers?: boolean;
    sync_invoices?: boolean;
    sync_payments?: boolean;
    sync_direction?: "import" | "export" | "bidirectional";
  };
}

// Customer interface for typing
interface CustomerRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
  phone_raw: string | null;
  notes: string | null;
}

// Refresh access token if expired
// deno-lint-ignore no-explicit-any
async function refreshTokenIfNeeded(
  connection: QuickBooksConnection,
  supabase: any
): Promise<string | null> {
  if (!connection.token_expires_at) {
    return connection.access_token_encrypted;
  }

  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();

  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token_encrypted;
  }

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) {
    console.error("QuickBooks credentials not configured");
    return null;
  }

  try {
    const basicAuth = btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`);
    const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token_encrypted,
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    const tokens = await response.json();

    // Update stored tokens
    await supabase
      .from("integration_connections")
      .update({
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", connection.tenant_id)
      .eq("integration_type", "quickbooks");

    return tokens.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// QuickBooks API helper
async function qbApiRequest(
  accessToken: string,
  realmId: string,
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<Response> {
  const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
  const url = `${baseUrl}/${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Sync customers from QuickBooks to CloseLoop
// deno-lint-ignore no-explicit-any
async function syncCustomersFromQB(
  accessToken: string,
  realmId: string,
  tenantId: string,
  supabase: any
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    // Query customers from QuickBooks
    const response = await qbApiRequest(
      accessToken,
      realmId,
      "query?query=SELECT * FROM Customer MAXRESULTS 1000"
    );

    if (!response.ok) {
      errors.push(`Failed to fetch customers: ${await response.text()}`);
      return { imported, errors };
    }

    const data = await response.json();
    const qbCustomers = data.QueryResponse?.Customer || [];

    for (const qbCustomer of qbCustomers) {
      try {
        // Check if customer already exists (by email or phone)
        const phone = qbCustomer.PrimaryPhone?.FreeFormNumber;
        const email = qbCustomer.PrimaryEmailAddr?.Address;

        if (!phone && !email) continue; // Skip customers without contact info

        let existingCustomer = null;

        if (email) {
          const { data } = await supabase
            .from("customers")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("email", email)
            .single();
          existingCustomer = data;
        }

        if (!existingCustomer && phone) {
          const { data } = await supabase
            .from("customers")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("phone_raw", phone)
            .single();
          existingCustomer = data;
        }

        if (!existingCustomer) {
          // Create new customer
          const { error: insertError } = await supabase.from("customers").insert({
            tenant_id: tenantId,
            full_name: qbCustomer.DisplayName || `${qbCustomer.GivenName || ""} ${qbCustomer.FamilyName || ""}`.trim(),
            email: email || null,
            phone_raw: phone || null,
            address: qbCustomer.BillAddr
              ? `${qbCustomer.BillAddr.Line1 || ""} ${qbCustomer.BillAddr.City || ""}, ${qbCustomer.BillAddr.CountrySubDivisionCode || ""} ${qbCustomer.BillAddr.PostalCode || ""}`.trim()
              : null,
            source: "quickbooks_import",
            notes: `QuickBooks ID: ${qbCustomer.Id}`,
          });

          if (!insertError) {
            imported++;
          } else {
            errors.push(`Failed to import ${qbCustomer.DisplayName}: ${insertError.message}`);
          }
        }
      } catch (e) {
        errors.push(`Error processing customer ${qbCustomer.Id}: ${e}`);
      }
    }
  } catch (error) {
    errors.push(`Customer sync error: ${error}`);
  }

  return { imported, errors };
}

// Export customers from CloseLoop to QuickBooks
// deno-lint-ignore no-explicit-any
async function syncCustomersToQB(
  accessToken: string,
  realmId: string,
  tenantId: string,
  supabase: any
): Promise<{ exported: number; errors: string[] }> {
  const errors: string[] = [];
  let exported = 0;

  try {
    // Get customers that don't have a QB ID in notes
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .not("notes", "like", "%QuickBooks ID:%");

    if (error) {
      errors.push(`Failed to fetch customers: ${error.message}`);
      return { exported, errors };
    }

    for (const rawCustomer of customers || []) {
      const customer = rawCustomer as CustomerRecord;
      try {
        // Create customer in QuickBooks
        const nameParts = (customer.full_name || "").split(" ");
        const givenName = nameParts[0] || "Unknown";
        const familyName = nameParts.slice(1).join(" ") || "";

        const qbCustomer = {
          DisplayName: customer.full_name || customer.email || customer.phone_e164,
          GivenName: givenName,
          FamilyName: familyName,
          PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
          PrimaryPhone: customer.phone_raw || customer.phone_e164
            ? { FreeFormNumber: customer.phone_raw || customer.phone_e164 }
            : undefined,
        };

        const response = await qbApiRequest(
          accessToken,
          realmId,
          "customer",
          "POST",
          qbCustomer
        );

        if (response.ok) {
          const data = await response.json();
          const qbId = data.Customer?.Id;

          // Update customer notes with QB ID
          if (qbId) {
            await supabase
              .from("customers")
              .update({
                notes: `${customer.notes || ""}\nQuickBooks ID: ${qbId}`.trim(),
              })
              .eq("id", customer.id);
            exported++;
          }
        } else {
          const errorText = await response.text();
          errors.push(`Failed to export ${customer.full_name}: ${errorText}`);
        }
      } catch (e) {
        errors.push(`Error exporting customer ${customer.id}: ${e}`);
      }
    }
  } catch (error) {
    errors.push(`Customer export error: ${error}`);
  }

  return { exported, errors };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { tenantId } = await requireAuthedTenant(req);
    const supabase = serviceClient();

    // Get QuickBooks connection
    const { data: connection, error: connError } = await supabase
      .from("integration_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("integration_type", "quickbooks")
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return errorResponse("QuickBooks not connected", 400);
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(connection as QuickBooksConnection, supabase);
    if (!accessToken) {
      // Mark connection as error
      await supabase
        .from("integration_connections")
        .update({
          status: "error",
          last_error: "Token refresh failed",
          last_error_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("integration_type", "quickbooks");

      return errorResponse("Failed to refresh QuickBooks token. Please reconnect.", 400);
    }

    const realmId = connection.external_account_id;
    const settings = connection.settings || {};
    const { sync_type } = await req.json().catch(() => ({}));

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      sync_type,
    };

    // Sync customers based on direction
    if (settings.sync_customers !== false) {
      if (settings.sync_direction === "import" || settings.sync_direction === "bidirectional" || !settings.sync_direction) {
        const importResult = await syncCustomersFromQB(accessToken, realmId, tenantId, supabase);
        results.customers_imported = importResult.imported;
        results.import_errors = importResult.errors;
      }

      if (settings.sync_direction === "export" || settings.sync_direction === "bidirectional") {
        const exportResult = await syncCustomersToQB(accessToken, realmId, tenantId, supabase);
        results.customers_exported = exportResult.exported;
        results.export_errors = exportResult.errors;
      }
    }

    // Update last sync timestamp
    await supabase
      .from("integration_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_items_count:
          (results.customers_imported as number || 0) +
          (results.customers_exported as number || 0),
        consecutive_errors: 0,
      })
      .eq("tenant_id", tenantId)
      .eq("integration_type", "quickbooks");

    return jsonResponse({ success: true, results });
  } catch (error: unknown) {
    console.error("Error in quickbooks-sync:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
