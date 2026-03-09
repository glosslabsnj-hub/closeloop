import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cl-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();

    // Dual-level param extraction (ElevenLabs sends nested or flat)
    const params = body.body ?? body;

    const tenantId = params.tenant_id || null;
    const conversationId = params.conversation_id || null;
    const query = params.query || "";
    const make = params.make || "";
    const model = params.model || "";
    const yearMin = params.year_min ? parseInt(params.year_min) : null;
    const yearMax = params.year_max ? parseInt(params.year_max) : null;
    const priceMin = params.price_min ? Math.round(parseFloat(params.price_min) * 100) : null;
    const priceMax = params.price_max ? Math.round(parseFloat(params.price_max) * 100) : (params.max_price ? Math.round(parseFloat(params.max_price) * 100) : null);
    // Separate condition keywords from body style - category="used" should filter condition, not body_style
    const CONDITION_KEYWORDS = new Set(["new", "used", "certified", "pre-owned", "preowned", "cpo"]);
    const categoryIsCondition = params.category && CONDITION_KEYWORDS.has(params.category.toLowerCase());
    const conditionFromCategory = categoryIsCondition ? (params.category.toLowerCase() === "pre-owned" || params.category.toLowerCase() === "preowned" || params.category.toLowerCase() === "cpo" ? "certified" : params.category.toLowerCase()) : "";
    const condition = params.condition || conditionFromCategory || "";
    const bodyStyle = params.body_style || (!categoryIsCondition ? params.category : "") || "";
    const color = params.color || "";
    const maxResults = Math.min(parseInt(params.max_results || "5"), 10);

    // Resolve tenant
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let resolvedTenantId = tenantId;
    if (!resolvedTenantId && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || null;
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm not able to search inventory right now. Want me to have someone call you back with that info?",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Build dynamic query
    let dbQuery = supabase
      .from("sales_inventory")
      .select("id, year, make, model, trim, body_style, condition, color_exterior, mileage, msrp_cents, asking_price_cents, internet_price_cents, features, stock_number, description")
      .eq("tenant_id", resolvedTenantId)
      .eq("status", "available");

    // Apply structured filters
    if (make) {
      dbQuery = dbQuery.ilike("make", `%${make}%`);
    }
    if (model) {
      dbQuery = dbQuery.ilike("model", `%${model}%`);
    }
    if (yearMin) {
      dbQuery = dbQuery.gte("year", yearMin);
    }
    if (yearMax) {
      dbQuery = dbQuery.lte("year", yearMax);
    }
    if (priceMin) {
      dbQuery = dbQuery.gte("asking_price_cents", priceMin);
    }
    if (priceMax) {
      dbQuery = dbQuery.lte("asking_price_cents", priceMax);
    }
    if (condition) {
      dbQuery = dbQuery.ilike("condition", condition);
    }
    if (bodyStyle) {
      dbQuery = dbQuery.ilike("body_style", `%${bodyStyle}%`);
    }
    if (color) {
      dbQuery = dbQuery.ilike("color_exterior", `%${color}%`);
    }

    // If free-text query provided but no structured filters, try keyword parsing
    if (query && !make && !model && !bodyStyle && !color && !priceMin && !priceMax && !condition) {
      // Parse common keywords from free-text
      const q = query.toLowerCase();

      // Body style keywords
      const bodyStyles = ["suv", "sedan", "truck", "coupe", "convertible", "van", "minivan", "wagon", "hatchback", "crossover"];
      const matchedBody = bodyStyles.find(b => q.includes(b));
      if (matchedBody) {
        dbQuery = dbQuery.ilike("body_style", `%${matchedBody}%`);
      }

      // Condition keywords
      if (q.includes("new")) {
        dbQuery = dbQuery.eq("condition", "new");
      } else if (q.includes("used") || q.includes("pre-owned") || q.includes("preowned")) {
        dbQuery = dbQuery.eq("condition", "used");
      } else if (q.includes("certified") || q.includes("cpo")) {
        dbQuery = dbQuery.eq("condition", "certified");
      }

      // Price hints (e.g., "under 20k", "below 15000")
      const priceMatch = q.match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d+)\s*k?/i);
      if (priceMatch) {
        let priceVal = parseInt(priceMatch[1]);
        if (priceVal < 1000) priceVal *= 1000; // "20k" -> 20000
        dbQuery = dbQuery.lte("asking_price_cents", priceVal * 100);
      }

      // Color keywords
      const colors = ["red", "blue", "black", "white", "silver", "gray", "grey", "green", "yellow", "orange", "brown", "gold", "beige", "tan"];
      const matchedColor = colors.find(c => q.includes(c));
      if (matchedColor) {
        dbQuery = dbQuery.ilike("color_exterior", `%${matchedColor}%`);
      }

      // Make/model - check if any word matches common makes
      const commonMakes = ["toyota", "honda", "ford", "chevrolet", "chevy", "nissan", "bmw", "mercedes", "audi", "hyundai", "kia", "subaru", "mazda", "volkswagen", "vw", "jeep", "dodge", "ram", "gmc", "buick", "cadillac", "lincoln", "lexus", "acura", "infiniti", "volvo", "porsche", "tesla", "rivian", "lucid"];
      const words = q.split(/\s+/);
      for (const word of words) {
        const matchedMake = commonMakes.find(m => word === m || (word === "chevy" && m === "chevrolet") || (word === "vw" && m === "volkswagen"));
        if (matchedMake) {
          const dbMake = matchedMake === "chevy" ? "chevrolet" : matchedMake === "vw" ? "volkswagen" : matchedMake;
          dbQuery = dbQuery.ilike("make", `%${dbMake}%`);
          break;
        }
      }
    }

    // Order by price and limit
    dbQuery = dbQuery.order("asking_price_cents", { ascending: true }).limit(maxResults);

    const { data: results, error } = await dbQuery;

    if (error) {
      console.error("[search-inventory] DB error:", error.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble pulling up inventory right now. Want me to have someone call you back with what we have?",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Get total available count for context
    const { count: totalAvailable } = await supabase
      .from("sales_inventory")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", resolvedTenantId)
      .eq("status", "available");

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "I don't see anything matching that right now. Our inventory changes frequently though — want me to set up a time for you to come browse in person, or have someone call you when something comes in?",
          results: [],
          total_available: totalAvailable || 0,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Format results into conversational message
    const formatPrice = (cents: number | null): string => {
      if (!cents) return "call for pricing";
      const dollars = Math.round(cents / 100);
      if (dollars >= 1000) {
        const thousands = (dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1);
        return `$${thousands.replace(/\.0$/, "")}k`;
      }
      return `$${dollars.toLocaleString()}`;
    };

    const formatMileage = (miles: number | null): string => {
      if (!miles) return "";
      if (miles >= 1000) {
        return `${Math.round(miles / 1000)}k miles`;
      }
      return `${miles} miles`;
    };

    const vehicleSummaries = results.map((v: any, i: number) => {
      const price = v.internet_price_cents || v.asking_price_cents;
      const parts = [
        `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`,
      ];
      if (v.body_style) parts[0] += ` (${v.body_style})`;
      if (v.color_exterior) parts.push(v.color_exterior);
      if (v.mileage) parts.push(formatMileage(v.mileage));
      parts.push(formatPrice(price));
      if (v.condition === "certified") parts.push("Certified Pre-Owned");

      // Add top features if available
      const features = Array.isArray(v.features) ? v.features : [];
      if (features.length > 0) {
        parts.push(features.slice(0, 3).join(", "));
      }

      return parts.join(" — ");
    });

    let message = `I found ${results.length} option${results.length > 1 ? "s" : ""} that match${results.length === 1 ? "es" : ""}. `;
    message += vehicleSummaries.join(". ");
    message += ". Would you like to come in and check any of these out? I can set up a time for you.";

    return new Response(
      JSON.stringify({
        success: true,
        message,
        results: results.map((v: any) => ({
          id: v.id,
          year: v.year,
          make: v.make,
          model: v.model,
          trim: v.trim,
          body_style: v.body_style,
          condition: v.condition,
          color: v.color_exterior,
          mileage: v.mileage,
          price_cents: v.internet_price_cents || v.asking_price_cents,
          stock_number: v.stock_number,
        })),
        total_available: totalAvailable || 0,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[search-inventory] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I'm having a little trouble pulling that up. Want me to have someone from the team call you with inventory details?",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
