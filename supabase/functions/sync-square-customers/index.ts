/**
 * sync-square-customers: Bidirectional customer sync between Square and Flux.
 *
 * Runs on:
 * 1. First Square integration connect (initial import)
 * 2. Periodic cron (picks up new/updated customers in both directions)
 * 3. Manual trigger from dashboard
 *
 * POST body: { tenant_id } or { integration_id }
 * Optional: { direction: "square_to_flux" | "flux_to_square" | "both" } (default: "both")
 *
 * Works for ANY tenant with a connected square_pos integration.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function squareFetch(
  path: string,
  accessToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`https://connect.squareup.com/v2${path}`, {
    method,
    headers: {
      "Square-Version": "2024-11-20",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Normalize phone to E.164 format */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

/** Build full name from Square customer */
function buildFullName(customer: any): string {
  const given = (customer.given_name || "").trim();
  const family = (customer.family_name || "").trim();
  if (given && family) return `${given} ${family}`;
  if (given) return given;
  if (family) return family;
  return "Unknown";
}

/** Build service address from Square address */
function buildAddress(address: any): string | null {
  if (!address) return null;
  const parts: string[] = [];
  if (address.address_line_1) parts.push(address.address_line_1.trim());
  if (address.locality) parts.push(address.locality.trim());
  if (address.administrative_district_level_1) parts.push(address.administrative_district_level_1.trim());
  if (address.postal_code) parts.push(address.postal_code.trim());
  return parts.length > 0 ? parts.join(", ") : null;
}

interface SyncStats {
  imported: number;
  updated: number;
  skipped_no_phone: number;
  skipped_duplicate: number;
  pushed_to_square: number;
  errors: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    const integrationId = body.integration_id;
    const direction = body.direction || "both";

    if (!tenantId && !integrationId) {
      return jsonResponse({ error: "tenant_id or integration_id required" }, 400);
    }

    // Find the Square integration
    let query = supabase
      .from("integrations")
      .select("id, tenant_id, config_json, status")
      .eq("provider", "square_pos")
      .eq("status", "connected");

    if (integrationId) {
      query = query.eq("id", integrationId);
    } else {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: integration, error: intError } = await query.maybeSingle();

    if (intError || !integration) {
      return jsonResponse({ success: false, skipped: true, message: "No connected Square integration" });
    }

    const config = integration.config_json as Record<string, string>;
    const accessToken = config.access_token;
    const effectiveTenantId = integration.tenant_id;

    if (!accessToken) {
      return jsonResponse({ success: false, error: "Square access_token missing" }, 500);
    }

    console.log(`[sync-square-customers] Starting ${direction} sync for tenant ${effectiveTenantId.substring(0, 8)}...`);

    const stats: SyncStats = {
      imported: 0,
      updated: 0,
      skipped_no_phone: 0,
      skipped_duplicate: 0,
      pushed_to_square: 0,
      errors: 0,
    };

    // ─── SQUARE → FLUX ───────────────────────────────────────────
    if (direction === "square_to_flux" || direction === "both") {
      // Fetch ALL Square customers (paginated)
      let cursor: string | null = null;
      let allSquareCustomers: any[] = [];

      do {
        const searchBody: Record<string, unknown> = { limit: 100 };
        if (cursor) searchBody.cursor = cursor;

        const res = await squareFetch("/customers/search", accessToken, "POST", searchBody);
        if (!res.ok) {
          console.error("[sync-square-customers] Square API error:", res.data);
          return jsonResponse({ success: false, error: "Square API error", details: res.data }, 500);
        }

        const customers = res.data.customers || [];
        allSquareCustomers = allSquareCustomers.concat(customers);
        cursor = res.data.cursor || null;
      } while (cursor);

      console.log(`[sync-square-customers] Fetched ${allSquareCustomers.length} Square customers`);

      // Get existing Flux customers for this tenant (for dedup)
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("id, phone_e164, contact_preferences")
        .eq("tenant_id", effectiveTenantId);

      const existingByPhone = new Map<string, { id: string; square_customer_id?: string }>();
      for (const c of existingCustomers || []) {
        const prefs = c.contact_preferences as Record<string, any> || {};
        existingByPhone.set(c.phone_e164, {
          id: c.id,
          square_customer_id: prefs.square_customer_id,
        });
      }

      // Import each Square customer
      for (const sq of allSquareCustomers) {
        const phone = normalizePhone(sq.phone_number);
        if (!phone) {
          stats.skipped_no_phone++;
          continue;
        }

        const fullName = buildFullName(sq);
        const existing = existingByPhone.get(phone);

        if (existing) {
          // Customer exists — update if Square ID not linked yet
          if (!existing.square_customer_id) {
            const { error: updateErr } = await supabase
              .from("customers")
              .update({
                contact_preferences: {
                  square_customer_id: sq.id,
                },
                email: sq.email_address || undefined,
                service_address: buildAddress(sq.address) || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);

            if (!updateErr) {
              stats.updated++;
            } else {
              stats.errors++;
            }
          } else {
            stats.skipped_duplicate++;
          }
          continue;
        }

        // New customer — insert
        const { error: insertErr } = await supabase.from("customers").insert({
          tenant_id: effectiveTenantId,
          phone_e164: phone,
          phone_raw: sq.phone_number || phone,
          full_name: fullName,
          email: sq.email_address || null,
          source: "square_import",
          service_address: buildAddress(sq.address),
          lead_status: "existing",
          tags: ["square"],
          contact_preferences: {
            square_customer_id: sq.id,
          },
        });

        if (insertErr) {
          // Could be race condition duplicate
          if (insertErr.code === "23505") {
            stats.skipped_duplicate++;
          } else {
            console.error(`[sync-square-customers] Insert error for ${fullName}:`, insertErr);
            stats.errors++;
          }
        } else {
          stats.imported++;
        }
      }
    }

    // ─── FLUX → SQUARE ───────────────────────────────────────────
    if (direction === "flux_to_square" || direction === "both") {
      // Find Flux customers that don't have a square_customer_id yet
      const { data: fluxCustomers } = await supabase
        .from("customers")
        .select("id, phone_e164, full_name, email, service_address, contact_preferences")
        .eq("tenant_id", effectiveTenantId)
        .neq("source", "square_import");

      for (const fc of fluxCustomers || []) {
        const prefs = fc.contact_preferences as Record<string, any> || {};
        if (prefs.square_customer_id) continue; // Already linked

        // Search Square by phone
        const searchRes = await squareFetch("/customers/search", accessToken, "POST", {
          query: {
            filter: {
              phone_number: { exact: fc.phone_e164 },
            },
          },
          limit: 1,
        });

        let squareId: string | null = null;

        if (searchRes.ok && searchRes.data.customers?.length > 0) {
          // Found existing Square customer — link it
          squareId = searchRes.data.customers[0].id;
        } else {
          // Create in Square
          const nameParts = fc.full_name.trim().split(/\s+/);
          const createRes = await squareFetch("/customers", accessToken, "POST", {
            idempotency_key: crypto.randomUUID(),
            given_name: nameParts[0] || "Customer",
            family_name: nameParts.slice(1).join(" ") || "",
            phone_number: fc.phone_e164 || undefined,
            email_address: fc.email || undefined,
          });

          if (createRes.ok && createRes.data.customer?.id) {
            squareId = createRes.data.customer.id;
          }
        }

        if (squareId) {
          // Link Square ID to Flux customer
          await supabase
            .from("customers")
            .update({
              contact_preferences: {
                ...prefs,
                square_customer_id: squareId,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", fc.id);

          stats.pushed_to_square++;
        }
      }
    }

    // Update integration sync timestamp
    await supabase
      .from("integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", integration.id);

    console.log(`[sync-square-customers] Done: imported=${stats.imported}, updated=${stats.updated}, pushed=${stats.pushed_to_square}, skipped_no_phone=${stats.skipped_no_phone}, skipped_dup=${stats.skipped_duplicate}, errors=${stats.errors}`);

    return jsonResponse({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[sync-square-customers] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
