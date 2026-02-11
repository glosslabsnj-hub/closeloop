import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface InventoryItem {
  stock_number?: string;
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  body_style?: string;
  color_exterior?: string;
  color_interior?: string;
  msrp_cents?: number;
  asking_price_cents?: number;
  internet_price_cents?: number;
  condition?: string;
  mileage?: number;
  status?: string;
  features?: string[];
  description?: string;
  photo_urls?: string[];
  lot_location?: string;
  days_on_lot?: number;
  external_id?: string;
}

interface SyncRequest {
  tenant_id: string;
  source: "dealersocket" | "vauto" | "cdk" | "manual";
  items: InventoryItem[];
  full_sync?: boolean; // If true, mark items not in payload as "sold"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireInternalSecret(req);
    const body: SyncRequest = await req.json();
    const { tenant_id, source, items, full_sync } = body;

    if (!tenant_id || !source || !Array.isArray(items)) {
      throw new Error("tenant_id, source, and items[] are required");
    }

    const supabase = serviceClient();

    let upserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
      try {
        // Must have at least stock_number or vin for upsert
        if (!item.stock_number && !item.vin) {
          skipped++;
          continue;
        }

        const record = {
          tenant_id,
          stock_number: item.stock_number || null,
          vin: item.vin || null,
          year: item.year || null,
          make: item.make || null,
          model: item.model || null,
          trim: item.trim || null,
          body_style: item.body_style || null,
          color_exterior: item.color_exterior || null,
          color_interior: item.color_interior || null,
          msrp_cents: item.msrp_cents ?? null,
          asking_price_cents: item.asking_price_cents ?? null,
          internet_price_cents: item.internet_price_cents ?? null,
          condition: item.condition || null,
          mileage: item.mileage ?? null,
          status: item.status || "available",
          features: item.features || null,
          description: item.description || null,
          photo_urls: item.photo_urls || null,
          lot_location: item.lot_location || null,
          days_on_lot: item.days_on_lot ?? null,
          external_id: item.external_id || null,
          external_source: source,
          last_synced_at: new Date().toISOString(),
        };

        // Try upsert by VIN first, then stock_number
        if (item.vin) {
          const { error } = await supabase
            .from("sales_inventory")
            .upsert(record, { onConflict: "tenant_id,vin", ignoreDuplicates: false });

          if (error) {
            console.error(`[sync-sales-inventory] VIN upsert error for ${item.vin}:`, error.message);
            errors++;
            continue;
          }
        } else if (item.stock_number) {
          const { error } = await supabase
            .from("sales_inventory")
            .upsert(record, { onConflict: "tenant_id,stock_number", ignoreDuplicates: false });

          if (error) {
            console.error(`[sync-sales-inventory] Stock upsert error for ${item.stock_number}:`, error.message);
            errors++;
            continue;
          }
        }

        upserted++;
      } catch (e) {
        console.error(`[sync-sales-inventory] Item error:`, e);
        errors++;
      }
    }

    // Full sync: mark items not present in this batch as "sold"
    if (full_sync && items.length > 0) {
      const syncedVins = items.map(i => i.vin).filter(Boolean) as string[];
      const syncedStocks = items.map(i => i.stock_number).filter(Boolean) as string[];

      if (syncedVins.length > 0) {
        await supabase
          .from("sales_inventory")
          .update({ status: "sold" })
          .eq("tenant_id", tenant_id)
          .eq("external_source", source)
          .eq("status", "available")
          .not("vin", "in", `(${syncedVins.join(",")})`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: { upserted, skipped, errors, total: items.length },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[sync-sales-inventory] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
