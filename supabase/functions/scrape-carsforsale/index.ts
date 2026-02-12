import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface VehicleListing {
  year: string;
  make: string;
  model: string;
  trim: string;
  body_style: string;
  asking_price_cents: number;
  original_price_cents: number;
  mileage: number;
  engine: string;
  drivetrain: string;
  days_on_lot: number;
  features: string[];
  photo_url: string;
  listing_url: string;
  condition: string;
}

/**
 * Parse the markdown scraped from a Cars For Sale dealer page into structured vehicle listings.
 */
function parseVehicleListings(markdown: string): VehicleListing[] {
  const vehicles: VehicleListing[] = [];

  const blocks = markdown.split(/- \[!\[/);

  for (const block of blocks) {
    try {
      const titleMatch = block.match(/\[\*\*(\d{4})\s+(.+?)\*\*\s+\*\*(.+?)\*\*/);
      if (!titleMatch) continue;

      const year = titleMatch[1];
      const fullName = titleMatch[2].trim();
      const trimDetail = titleMatch[3].trim();

      const nameParts = fullName.split(/\s+/);
      const make = nameParts[0] || "";
      const model = nameParts.slice(1, -1).join(" ") || nameParts.slice(1).join(" ") || "";
      const trim = nameParts[nameParts.length - 1] || "";

      let bodyStyle = "Unknown";
      if (/sedan/i.test(trimDetail)) bodyStyle = "Sedan";
      else if (/suv/i.test(trimDetail)) bodyStyle = "SUV";
      else if (/truck|crew cab|pickup/i.test(trimDetail)) bodyStyle = "Pickup Truck";
      else if (/wagon/i.test(trimDetail)) bodyStyle = "Wagon";
      else if (/minivan/i.test(trimDetail)) bodyStyle = "Minivan";
      else if (/coupe/i.test(trimDetail)) bodyStyle = "Coupe";
      else if (/convertible/i.test(trimDetail)) bodyStyle = "Convertible";
      else if (/hatchback/i.test(trimDetail)) bodyStyle = "Hatchback";

      const priceMatches = block.match(/\$([0-9,]+)/g);
      let askingPriceCents = 0;
      let originalPriceCents = 0;
      if (priceMatches && priceMatches.length >= 1) {
        askingPriceCents = parseInt(priceMatches[0].replace(/[$,]/g, "")) * 100;
        if (priceMatches.length >= 2) {
          originalPriceCents = parseInt(priceMatches[1].replace(/[$,]/g, "")) * 100;
        }
      }

      const mileageMatch = block.match(/- ([0-9,]+)\\\\\s*\n\s*miles/i) || block.match(/([0-9,]+)\s*\\\\\s*\n\s*miles/i);
      const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, "")) : 0;

      const engineMatch = block.match(/Engine:\s*\\?\s*\n\s*\\?\s*\n?\s*(.+?)\\?\s*\n/);
      const engine = engineMatch ? engineMatch[1].trim().replace(/\\/g, "") : "";

      const drivetrainMatch = block.match(/Drivetrain:\s*\\?\s*\n\s*\\?\s*\n?\s*(\w+)/);
      const drivetrain = drivetrainMatch ? drivetrainMatch[1].trim() : "";

      const daysMatch = block.match(/Days Listed\s*\\?\s*\n\s*\\?\s*\n?\s*(\d+)/);
      const daysOnLot = daysMatch ? parseInt(daysMatch[1]) : 0;

      const featuresMatch = block.match(/Features:(.+?)(?:\]|\n)/);
      const features = featuresMatch
        ? featuresMatch[1].split(",").map(f => f.trim()).filter(Boolean)
        : [];

      const urlMatch = block.match(/https:\/\/www\.carsforsale\.com\/[^\s")\]]+\/details\/\d+/);
      const listingUrl = urlMatch ? urlMatch[0] : "";

      const photoMatch = block.match(/https:\/\/cdn\d+\.carsforsale\.com\/[^\s")]+\.jpg/);
      const photoUrl = photoMatch ? photoMatch[0] : "";

      vehicles.push({
        year,
        make,
        model,
        trim,
        body_style: bodyStyle,
        asking_price_cents: askingPriceCents,
        original_price_cents: originalPriceCents,
        mileage,
        engine,
        drivetrain,
        days_on_lot: daysOnLot,
        features,
        photo_url: photoUrl,
        listing_url: listingUrl,
        condition: "used",
      });
    } catch (e) {
      console.error("[scrape-carsforsale] Failed to parse block:", e);
    }
  }

  return vehicles;
}

/**
 * Scrape a single URL and return parsed vehicles.
 */
async function scrapeUrl(url: string, firecrawlKey: string): Promise<VehicleListing[]> {
  console.log(`[scrape-carsforsale] Scraping ${url}`);

  const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  const scrapeData = await scrapeResponse.json();

  if (!scrapeResponse.ok || !scrapeData.success) {
    console.error("[scrape-carsforsale] Firecrawl error for", url, scrapeData);
    return [];
  }

  const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
  console.log(`[scrape-carsforsale] Got ${markdown.length} chars from ${url}`);

  return parseVehicleListings(markdown);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, full_sync } = body;

    // Support both single dealer_url and multiple dealer_urls
    let urls: string[] = [];
    if (body.dealer_urls && Array.isArray(body.dealer_urls)) {
      urls = body.dealer_urls;
    } else if (body.dealer_url) {
      urls = [body.dealer_url];
    }

    if (!tenant_id || urls.length === 0) {
      throw new Error("tenant_id and dealer_url(s) are required");
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    // Scrape all URLs and combine results
    const allVehicles: VehicleListing[] = [];
    for (const url of urls) {
      const vehicles = await scrapeUrl(url, firecrawlKey);
      allVehicles.push(...vehicles);
    }

    console.log(`[scrape-carsforsale] Total parsed across ${urls.length} pages: ${allVehicles.length} vehicles`);

    // Upsert into sales_inventory
    const supabase = serviceClient();
    let upserted = 0;
    let errors = 0;

    for (const vehicle of allVehicles) {
      try {
        const externalId = vehicle.listing_url
          ? `carsforsale:${vehicle.listing_url.match(/details\/(\d+)/)?.[1] || ""}`
          : null;

        const record = {
          tenant_id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          body_style: vehicle.body_style,
          asking_price_cents: vehicle.asking_price_cents,
          msrp_cents: vehicle.original_price_cents || null,
          mileage: vehicle.mileage,
          condition: vehicle.condition,
          features: vehicle.features,
          description: `${vehicle.engine} • ${vehicle.drivetrain}`,
          photo_urls: vehicle.photo_url ? [vehicle.photo_url] : null,
          listing_url: vehicle.listing_url,
          days_on_lot: vehicle.days_on_lot,
          external_id: externalId,
          external_source: "carsforsale",
          financing_available: true,
          trade_in_eligible: true,
          status: "available",
          last_synced_at: new Date().toISOString(),
        };

        if (externalId) {
          const { data: existing } = await supabase
            .from("sales_inventory")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("external_id", externalId)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from("sales_inventory")
              .update(record)
              .eq("id", existing.id);
            if (error) { errors++; continue; }
          } else {
            const { error } = await supabase
              .from("sales_inventory")
              .insert(record);
            if (error) { errors++; continue; }
          }
        } else {
          const { error } = await supabase
            .from("sales_inventory")
            .insert(record);
          if (error) { errors++; continue; }
        }

        upserted++;
      } catch (e) {
        console.error(`[scrape-carsforsale] Vehicle error:`, e);
        errors++;
      }
    }

    // Full sync: mark items not in this scrape as sold
    if (full_sync && allVehicles.length > 0) {
      const scrapedExternalIds = allVehicles
        .map(v => `carsforsale:${v.listing_url.match(/details\/(\d+)/)?.[1] || ""}`)
        .filter(id => id !== "carsforsale:");

      if (scrapedExternalIds.length > 0) {
        await supabase
          .from("sales_inventory")
          .update({ status: "sold" })
          .eq("tenant_id", tenant_id)
          .eq("external_source", "carsforsale")
          .eq("status", "available")
          .not("external_id", "in", `(${scrapedExternalIds.join(",")})`);
      }
    }

    const result = {
      success: true,
      summary: {
        total_scraped: allVehicles.length,
        pages_scraped: urls.length,
        upserted,
        errors,
        source_urls: urls,
      },
    };

    console.log(`[scrape-carsforsale] Done:`, result.summary);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[scrape-carsforsale] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
