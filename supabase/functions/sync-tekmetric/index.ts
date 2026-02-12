import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const TEKMETRIC_BASE_URL = "https://shop.tekmetric.com";

const STATUS_MAP: Record<string, string> = {
  Estimate: "intake",
  "Work In Progress": "in_progress",
  Complete: "completed",
  "Saved for Later": "on_hold",
  Posted: "picked_up",
  Deleted: "cancelled",
};

function mapStatus(tekStatus: string): string {
  return STATUS_MAP[tekStatus] || "intake";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const targetTenantId = body.tenant_id;

    const svc = serviceClient();

    // If a specific tenant is provided, sync just that one
    // Otherwise this is called from the cron to sync all active tenants
    let integrations: Array<Record<string, unknown>> = [];

    if (targetTenantId) {
      const { data, error } = await svc
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", targetTenantId)
        .eq("provider", "tekmetric")
        .eq("is_active", true)
        .single();

      if (error || !data) return errorResponse("No active Tekmetric integration for this tenant");
      integrations = [data];
    } else {
      const { data, error } = await svc
        .from("tenant_integrations")
        .select("*")
        .eq("provider", "tekmetric")
        .eq("is_active", true);

      if (error) return errorResponse("Failed to fetch integrations");
      integrations = data || [];
    }

    const results: Array<Record<string, unknown>> = [];

    for (const integration of integrations) {
      const tenantId = integration.tenant_id as string;
      const creds = integration.credentials_json as Record<string, string>;
      const config = integration.config_json as Record<string, unknown>;
      const accessToken = creds?.access_token;
      const shopId = config?.selected_shop_id;

      if (!accessToken || !shopId) {
        results.push({ tenant_id: tenantId, error: "Missing credentials or shop_id" });
        continue;
      }

      try {
        const syncResult = await syncTenantRepairOrders(
          svc,
          tenantId,
          accessToken,
          String(shopId),
          integration.sync_cursor as string | null,
          integration.id as string
        );
        results.push({ tenant_id: tenantId, ...syncResult });
      } catch (err) {
        console.error(`[sync-tekmetric] Error syncing tenant ${tenantId}:`, err);
        results.push({ tenant_id: tenantId, error: err.message });
      }
    }

    return jsonResponse({ synced: results.length, results });
  } catch (err) {
    console.error("[sync-tekmetric] Error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});

async function syncTenantRepairOrders(
  svc: ReturnType<typeof serviceClient>,
  tenantId: string,
  accessToken: string,
  shopId: string,
  syncCursor: string | null,
  integrationId: string
) {
  // Build query params
  const params = new URLSearchParams({ shop: shopId, size: "100" });
  if (syncCursor) {
    params.set("updatedDateStart", syncCursor);
  }

  const url = `${TEKMETRIC_BASE_URL}/api/v1/repair-orders?${params}`;
  console.log(`[sync-tekmetric] Fetching: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tekmetric API error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const repairOrders = data.content || data.data || [];

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let latestUpdatedDate = syncCursor || "";

  for (const ro of repairOrders) {
    try {
      const externalId = `tekmetric:${ro.id}`;
      const roNumber = String(ro.repairOrderNumber || ro.roNumber || ro.id);
      const tekStatus = ro.repairOrderStatus?.name || ro.status || "Estimate";
      const clStatus = mapStatus(tekStatus);

      // Track latest updated date for cursor
      const roUpdated = ro.updatedDate || ro.updatedAt || "";
      if (roUpdated > latestUpdatedDate) latestUpdatedDate = roUpdated;

      // Resolve customer
      let customerId: string | null = null;
      let customerName: string | null = null;
      let customerPhone: string | null = null;

      const customer = ro.customer;
      if (customer) {
        customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || null;
        const rawPhone = customer.phone?.[0]?.number || customer.phone || customer.phoneNumber || "";
        customerPhone = normalizePhoneE164(typeof rawPhone === "string" ? rawPhone : String(rawPhone));

        if (customerPhone) {
          // Try to find existing customer
          const { data: existing } = await svc
            .from("customers")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("phone_e164", customerPhone)
            .maybeSingle();

          if (existing) {
            customerId = existing.id;
          } else {
            // Create new customer
            const { data: newCust } = await svc
              .from("customers")
              .insert({
                tenant_id: tenantId,
                phone_e164: customerPhone,
                phone_raw: typeof rawPhone === "string" ? rawPhone : String(rawPhone),
                full_name: customerName || "Unknown",
                source: "tekmetric",
              })
              .select("id")
              .single();
            customerId = newCust?.id || null;
          }
        }
      }

      // Resolve vehicle
      let vehicleId: string | null = null;
      const vehicle = ro.vehicle;
      if (vehicle) {
        const vin = vehicle.vin || null;
        const year = vehicle.year ? String(vehicle.year) : null;
        const make = vehicle.make || null;
        const model = vehicle.model || null;

        if (vin) {
          const { data: existingV } = await svc
            .from("customer_vehicles")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("vin", vin)
            .maybeSingle();

          if (existingV) {
            vehicleId = existingV.id;
          } else {
            const { data: newV } = await svc
              .from("customer_vehicles")
              .insert({
                tenant_id: tenantId,
                customer_id: customerId,
                vin,
                year: year ? parseInt(year) : null,
                make,
                model,
              })
              .select("id")
              .single();
            vehicleId = newV?.id || null;
          }
        } else if (year && make && model && customerId) {
          // Match by YMM + customer
          const { data: existingV } = await svc
            .from("customer_vehicles")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("customer_id", customerId)
            .eq("year", parseInt(year))
            .eq("make", make)
            .eq("model", model)
            .maybeSingle();

          if (existingV) {
            vehicleId = existingV.id;
          } else {
            const { data: newV } = await svc
              .from("customer_vehicles")
              .insert({
                tenant_id: tenantId,
                customer_id: customerId,
                year: parseInt(year),
                make,
                model,
              })
              .select("id")
              .single();
            vehicleId = newV?.id || null;
          }
        }
      }

      // Build job title
      const vehicleLabel = vehicle
        ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
        : "";
      const title = vehicleLabel || `RO #${roNumber}`;

      // Upsert active_job
      const { data: existingJob } = await svc
        .from("active_jobs")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("external_id", externalId)
        .maybeSingle();

      if (existingJob) {
        // Update existing
        await svc
          .from("active_jobs")
          .update({
            status: clStatus,
            title,
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            vehicle_id: vehicleId,
            is_active: clStatus !== "cancelled" && clStatus !== "picked_up",
            actual_completion: clStatus === "completed" ? new Date().toISOString() : undefined,
          })
          .eq("id", existingJob.id);
        updated++;
      } else {
        // Create new
        const { data: newJob, error: jobErr } = await svc
          .from("active_jobs")
          .insert({
            tenant_id: tenantId,
            external_id: externalId,
            job_number: `RO-${roNumber}`,
            title,
            status: clStatus,
            priority: "normal",
            intake_method: "tekmetric",
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            vehicle_id: vehicleId,
            is_active: clStatus !== "cancelled" && clStatus !== "picked_up",
            metadata_json: {
              tekmetric_ro_id: ro.id,
              tekmetric_status: tekStatus,
            },
          })
          .select("id")
          .single();

        if (jobErr) {
          console.error("[sync-tekmetric] Job insert error:", jobErr);
          skipped++;
          continue;
        }

        // Create service items from Tekmetric "jobs"
        const tekJobs = ro.jobs || [];
        if (newJob && tekJobs.length > 0) {
          const items = tekJobs.map((j: Record<string, unknown>, i: number) => ({
            job_id: newJob.id,
            tenant_id: tenantId,
            title: (j.name || j.description || `Service ${i + 1}`) as string,
            status: j.completed ? "completed" : "pending",
            sort_order: i,
          }));

          await svc.from("job_service_items").insert(items);
        }

        created++;
      }
    } catch (roErr) {
      console.error("[sync-tekmetric] RO processing error:", roErr);
      skipped++;
    }
  }

  // Update sync cursor
  await svc
    .from("tenant_integrations")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_cursor: latestUpdatedDate || null,
    })
    .eq("id", integrationId);

  console.log(`[sync-tekmetric] Tenant ${tenantId}: created=${created}, updated=${updated}, skipped=${skipped}`);
  return { created, updated, skipped, total: repairOrders.length };
}
