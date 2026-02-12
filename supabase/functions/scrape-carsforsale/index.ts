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
  transmission: string;
  fuel_type: string;
  days_on_lot: number;
  features: string[];
  photo_url: string;
  photo_urls: string[];
  listing_url: string;
  condition: string;
  color_exterior: string;
  color_interior: string;
  stock_number: string;
  seller_notes: string;
  mpg_city: number;
  mpg_highway: number;
}

/**
 * Parse the markdown scraped from a Cars For Sale dealer LIST page into structured vehicle listings.
 * Color/interior data is NOT on the list page — only on detail pages.
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
        transmission: "",
        fuel_type: "",
        days_on_lot: daysOnLot,
        features,
        photo_url: photoUrl,
        photo_urls: photoUrl ? [photoUrl] : [],
        listing_url: listingUrl,
        condition: "used",
        color_exterior: "",
        color_interior: "",
        stock_number: "",
        seller_notes: "",
        mpg_city: 0,
        mpg_highway: 0,
      });
    } catch (e) {
      console.error("[scrape-carsforsale] Failed to parse list block:", e);
    }
  }

  return vehicles;
}

/**
 * Parse a detail page markdown for enriched vehicle data (color, stock#, features, seller notes).
 */
function parseDetailPage(markdown: string): Partial<VehicleListing> {
  const result: Partial<VehicleListing> = {};

  // Exterior Color: appears as "- Exterior Color\n\n\n\nSuper Black"
  const extColorMatch = markdown.match(/Exterior Color\s*\n+\s*\n*\s*([A-Za-z][\w\s/()-]+)/i);
  if (extColorMatch) result.color_exterior = extColorMatch[1].trim();

  // Interior Color
  const intColorMatch = markdown.match(/Interior Color\s*\n+\s*\n*\s*([A-Za-z][\w\s/()-]+)/i);
  if (intColorMatch) result.color_interior = intColorMatch[1].trim();

  // Stock #
  const stockMatch = markdown.match(/Stock #\s*\n+\s*\n*\s*([A-Za-z0-9]+)/i);
  if (stockMatch) result.stock_number = stockMatch[1].trim();

  // Transmission
  const transMatch = markdown.match(/Transmission\s*\n+\s*\n*\s*([A-Za-z][\w\s]+)/i);
  if (transMatch) result.transmission = transMatch[1].trim();

  // Fuel type
  const fuelMatch = markdown.match(/- Fuel\s*\n+\s*\n*\s*([A-Za-z][\w\s/]+)/i);
  if (fuelMatch) result.fuel_type = fuelMatch[1].trim();

  // MPG
  const mpgCityMatch = markdown.match(/(\d+)\s*mpg\s*\n+\s*\n*City/i);
  if (mpgCityMatch) result.mpg_city = parseInt(mpgCityMatch[1]);

  const mpgHwyMatch = markdown.match(/(\d+)\s*mpg\s*\n+\s*\n*Highway/i);
  if (mpgHwyMatch) result.mpg_highway = parseInt(mpgHwyMatch[1]);

  // Premium Features (better list than the comma-separated list page)
  const premiumBlock = markdown.match(/## Premium Features[\s\S]*?(?=## Standard Features|## Listing|## Seller|$)/i);
  if (premiumBlock) {
    const feats = premiumBlock[0].match(/^- (.+)$/gm);
    if (feats && feats.length > 0) {
      result.features = feats.map(f => f.replace(/^- /, "").trim()).filter(Boolean);
    }
  }

  // Seller's Notes
  const sellerBlock = markdown.match(/## Seller's Notes\s*\n+([\s\S]*?)(?=##|\n\n\n|$)/i);
  if (sellerBlock) {
    result.seller_notes = sellerBlock[1].trim().slice(0, 2000); // cap at 2000 chars
  }

  // Collect all photo URLs from the detail page
  const photoUrls: string[] = [];
  const photoRegex = /https:\/\/cdn\d+\.carsforsale\.com\/[^\s")\]]+\.jpg/g;
  let pm;
  while ((pm = photoRegex.exec(markdown)) !== null) {
    if (!photoUrls.includes(pm[0]) && !pm[0].includes("car.gif")) {
      photoUrls.push(pm[0]);
    }
  }
  if (photoUrls.length > 0) result.photo_urls = photoUrls;

  return result;
}

/**
 * Scrape a single URL and return parsed vehicles.
 */
async function scrapeUrl(url: string, firecrawlKey: string): Promise<VehicleListing[]> {
  console.log(`[scrape-carsforsale] Scraping list page ${url}`);

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
  console.log(`[scrape-carsforsale] Got ${markdown.length} chars from list page`);

  return parseVehicleListings(markdown);
}

/**
 * Scrape a single detail page for enriched data.
 */
async function scrapeDetailPage(url: string, firecrawlKey: string): Promise<Partial<VehicleListing>> {
  try {
    console.log(`[scrape-carsforsale] Scraping detail page ${url}`);

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
        waitFor: 2000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("[scrape-carsforsale] Detail page error for", url);
      return {};
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    return parseDetailPage(markdown);
  } catch (e) {
    console.error("[scrape-carsforsale] Detail scrape failed:", e);
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, full_sync, enrich_details } = body;

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

    // Step 1: Scrape all list pages
    const allVehicles: VehicleListing[] = [];
    for (const url of urls) {
      const vehicles = await scrapeUrl(url, firecrawlKey);
      allVehicles.push(...vehicles);
    }

    console.log(`[scrape-carsforsale] Total parsed across ${urls.length} pages: ${allVehicles.length} vehicles`);

    // Step 2: Enrich with detail pages (opt-in, default true)
    const shouldEnrich = enrich_details !== false;
    let enriched = 0;

    if (shouldEnrich) {
      // Process detail pages in batches of 3 to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < allVehicles.length; i += batchSize) {
        const batch = allVehicles.slice(i, i + batchSize);
        const detailPromises = batch.map(v =>
          v.listing_url ? scrapeDetailPage(v.listing_url, firecrawlKey) : Promise.resolve({})
        );

        const details = await Promise.all(detailPromises);

        for (let j = 0; j < batch.length; j++) {
          const detail = details[j];
          if (detail && Object.keys(detail).length > 0) {
            const v = allVehicles[i + j];
            if (detail.color_exterior) v.color_exterior = detail.color_exterior;
            if (detail.color_interior) v.color_interior = detail.color_interior;
            if (detail.stock_number) v.stock_number = detail.stock_number;
            if (detail.transmission) v.transmission = detail.transmission;
            if (detail.fuel_type) v.fuel_type = detail.fuel_type;
            if (detail.mpg_city) v.mpg_city = detail.mpg_city;
            if (detail.mpg_highway) v.mpg_highway = detail.mpg_highway;
            if (detail.features && detail.features.length > 0) v.features = detail.features;
            if (detail.seller_notes) v.seller_notes = detail.seller_notes;
            if (detail.photo_urls && detail.photo_urls.length > 0) v.photo_urls = detail.photo_urls;
            enriched++;
          }
        }

        // Small delay between batches
        if (i + batchSize < allVehicles.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      console.log(`[scrape-carsforsale] Enriched ${enriched}/${allVehicles.length} vehicles with detail data`);
    }

    // Step 3: Upsert into sales_inventory
    const supabase = serviceClient();
    let upserted = 0;
    let errors = 0;

    for (const vehicle of allVehicles) {
      try {
        const externalId = vehicle.listing_url
          ? `carsforsale:${vehicle.listing_url.match(/details\/(\d+)/)?.[1] || ""}`
          : null;

        const descParts = [vehicle.engine, vehicle.drivetrain, vehicle.transmission, vehicle.fuel_type]
          .filter(Boolean);

        const record: Record<string, unknown> = {
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
          description: descParts.join(" • ") || null,
          photo_urls: vehicle.photo_urls.length > 0 ? vehicle.photo_urls : (vehicle.photo_url ? [vehicle.photo_url] : null),
          listing_url: vehicle.listing_url,
          days_on_lot: vehicle.days_on_lot,
          external_id: externalId,
          external_source: "carsforsale",
          financing_available: true,
          trade_in_eligible: true,
          status: "available",
          last_synced_at: new Date().toISOString(),
        };

        // Only set color/stock/special_notes if we have them (from detail pages)
        if (vehicle.color_exterior) record.color_exterior = vehicle.color_exterior;
        if (vehicle.color_interior) record.color_interior = vehicle.color_interior;
        if (vehicle.stock_number) record.stock_number = vehicle.stock_number;
        if (vehicle.seller_notes) record.special_notes = vehicle.seller_notes;

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
            if (error) { console.error("[scrape-carsforsale] Update error:", error); errors++; continue; }
          } else {
            const { error } = await supabase
              .from("sales_inventory")
              .insert(record);
            if (error) { console.error("[scrape-carsforsale] Insert error:", error); errors++; continue; }
          }
        } else {
          const { error } = await supabase
            .from("sales_inventory")
            .insert(record);
          if (error) { console.error("[scrape-carsforsale] Insert error:", error); errors++; continue; }
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
        detail_pages_enriched: enriched,
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
