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
 * Uses regex patterns matched against the known markdown structure.
 */
function parseVehicleListings(markdown: string): VehicleListing[] {
  const vehicles: VehicleListing[] = [];

  // Each vehicle block starts with a pattern like:
  // [**YEAR MAKE MODEL TRIM**  **TRIM_DETAIL** \
  // followed by price, mileage, engine, drivetrain, days listed, features
  // and ends with a listing URL

  // Split by listing image pattern to get individual vehicle blocks
  const blocks = markdown.split(/- \[!\[/);

  for (const block of blocks) {
    try {
      // Extract title: **YEAR MAKE MODEL TRIM**
      const titleMatch = block.match(/\[\*\*(\d{4})\s+(.+?)\*\*\s+\*\*(.+?)\*\*/);
      if (!titleMatch) continue;

      const year = titleMatch[1];
      const fullName = titleMatch[2].trim();
      const trimDetail = titleMatch[3].trim();

      // Parse make/model from full name (e.g., "Nissan Sentra S" or "Chevrolet Equinox LT")
      const nameParts = fullName.split(/\s+/);
      const make = nameParts[0] || "";
      const model = nameParts.slice(1, -1).join(" ") || nameParts.slice(1).join(" ") || "";
      const trim = nameParts[nameParts.length - 1] || "";

      // Extract body style from trim detail (e.g., "S 4dr Sedan CVT", "LT 4dr SUV w/1LT")
      let bodyStyle = "Unknown";
      if (/sedan/i.test(trimDetail)) bodyStyle = "Sedan";
      else if (/suv/i.test(trimDetail)) bodyStyle = "SUV";
      else if (/truck|crew cab|pickup/i.test(trimDetail)) bodyStyle = "Pickup Truck";
      else if (/wagon/i.test(trimDetail)) bodyStyle = "Wagon";
      else if (/minivan/i.test(trimDetail)) bodyStyle = "Minivan";
      else if (/coupe/i.test(trimDetail)) bodyStyle = "Coupe";
      else if (/convertible/i.test(trimDetail)) bodyStyle = "Convertible";
      else if (/hatchback/i.test(trimDetail)) bodyStyle = "Hatchback";

      // Extract asking price (the first/lower price): $X,XXX
      const priceMatches = block.match(/\$([0-9,]+)/g);
      let askingPriceCents = 0;
      let originalPriceCents = 0;
      if (priceMatches && priceMatches.length >= 1) {
        askingPriceCents = parseInt(priceMatches[0].replace(/[$,]/g, "")) * 100;
        if (priceMatches.length >= 2) {
          originalPriceCents = parseInt(priceMatches[1].replace(/[$,]/g, "")) * 100;
        }
      }

      // Extract mileage: "121,113\\\n    miles\\"
      const mileageMatch = block.match(/- ([0-9,]+)\\\\\s*\n\s*miles/i) || block.match(/([0-9,]+)\s*\\\\\s*\n\s*miles/i);
      const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, "")) : 0;

      // Extract engine
      const engineMatch = block.match(/Engine:\s*\\?\s*\n\s*\\?\s*\n?\s*(.+?)\\?\s*\n/);
      const engine = engineMatch ? engineMatch[1].trim().replace(/\\/g, "") : "";

      // Extract drivetrain
      const drivetrainMatch = block.match(/Drivetrain:\s*\\?\s*\n\s*\\?\s*\n?\s*(\w+)/);
      const drivetrain = drivetrainMatch ? drivetrainMatch[1].trim() : "";

      // Extract days listed
      const daysMatch = block.match(/Days Listed\s*\\?\s*\n\s*\\?\s*\n?\s*(\d+)/);
      const daysOnLot = daysMatch ? parseInt(daysMatch[1]) : 0;

      // Extract features
      const featuresMatch = block.match(/Features:(.+?)(?:\]|\n)/);
      const features = featuresMatch
        ? featuresMatch[1].split(",").map(f => f.trim()).filter(Boolean)
        : [];

      // Extract listing URL
      const urlMatch = block.match(/https:\/\/www\.carsforsale\.com\/[^\s")\]]+\/details\/\d+/);
      const listingUrl = urlMatch ? urlMatch[0] : "";

      // Extract photo URL
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, dealer_url, full_sync } = await req.json();

    if (!tenant_id || !dealer_url) {
      throw new Error("tenant_id and dealer_url are required");
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    console.log(`[scrape-carsforsale] Scraping ${dealer_url} for tenant ${tenant_id}`);

    // Scrape the dealer page with Firecrawl
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: dealer_url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000, // Wait for JS rendering
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("[scrape-carsforsale] Firecrawl error:", scrapeData);
      throw new Error(`Firecrawl scrape failed: ${scrapeData.error || scrapeResponse.status}`);
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    console.log(`[scrape-carsforsale] Got ${markdown.length} chars of markdown`);

    // Parse vehicle listings from markdown
    const vehicles = parseVehicleListings(markdown);
    console.log(`[scrape-carsforsale] Parsed ${vehicles.length} vehicles`);

    // Upsert into sales_inventory
    const supabase = serviceClient();
    let upserted = 0;
    let errors = 0;

    for (const vehicle of vehicles) {
      try {
        // Use listing URL as external_id for deduplication
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

        // Try to find existing by external_id, or insert new
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
            if (error) {
              console.error(`[scrape-carsforsale] Update error:`, error.message);
              errors++;
              continue;
            }
          } else {
            const { error } = await supabase
              .from("sales_inventory")
              .insert(record);
            if (error) {
              console.error(`[scrape-carsforsale] Insert error:`, error.message);
              errors++;
              continue;
            }
          }
        } else {
          const { error } = await supabase
            .from("sales_inventory")
            .insert(record);
          if (error) {
            console.error(`[scrape-carsforsale] Insert error:`, error.message);
            errors++;
            continue;
          }
        }

        upserted++;
      } catch (e) {
        console.error(`[scrape-carsforsale] Vehicle error:`, e);
        errors++;
      }
    }

    // Full sync: mark items not in this scrape as sold
    if (full_sync && vehicles.length > 0) {
      const scrapedExternalIds = vehicles
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
        total_scraped: vehicles.length,
        upserted,
        errors,
        source_url: dealer_url,
      },
      vehicles: vehicles.map(v => ({
        title: `${v.year} ${v.make} ${v.model} ${v.trim}`,
        price: `$${(v.asking_price_cents / 100).toLocaleString()}`,
        mileage: `${v.mileage.toLocaleString()} mi`,
      })),
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
