// v2.0.0 - Lightweight fetch-based implementation to avoid cold-start timeouts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LotInfoRequest {
  tenant_id: string;
  lot_id?: string;
}

interface HoursEntry {
  open: string | null;
  close: string | null;
}

type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const DAY_ORDER: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Lookup tenant by name using ilike
async function resolveTenantByName(url: string, key: string, name: string): Promise<string | null> {
  const response = await fetch(
    `${url}/rest/v1/tenants?name=ilike.*${encodeURIComponent(name)}*&select=id&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data?.[0]?.id || null;
}

// Fetch impound lot(s)
async function fetchImpoundLots(
  url: string,
  key: string,
  tenantId: string,
  lotId?: string
): Promise<any[]> {
  let queryUrl = `${url}/rest/v1/impound_lots?tenant_id=eq.${tenantId}&is_active=eq.true&select=*`;

  if (lotId) {
    queryUrl += `&id=eq.${lotId}`;
  } else {
    queryUrl += "&order=is_default.desc&limit=1";
  }

  const response = await fetch(queryUrl, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return [];
  return await response.json();
}

// Format time from 24h to 12h AM/PM
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  if (minutes === 0) {
    return `${hours12} ${period}`;
  }
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Format time for speech (simpler)
function formatTimeForSpeech(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const hours12 = hours % 12 || 12;
  if (minutes === 0) {
    return `${hours12}`;
  }
  return `${hours12}:${minutes.toString().padStart(2, "0")}`;
}

// Get current day name
function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

// Check if current time is within hours
function isOpenNow(hours: HoursEntry | null): boolean {
  if (!hours || !hours.open || !hours.close) return false;

  const now = new Date();
  const [openHour, openMin] = hours.open.split(":").map(Number);
  const [closeHour, closeMin] = hours.close.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// Get current status message
function getCurrentStatus(hoursJson: Record<string, HoursEntry>): string {
  const todayName = getCurrentDayName();
  const todayHours = hoursJson[todayName];

  if (!todayHours?.open || !todayHours?.close) {
    return "Closed today";
  }

  const now = new Date();
  const [openHour, openMin] = todayHours.open.split(":").map(Number);
  const [closeHour, closeMin] = todayHours.close.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  if (currentMinutes < openMinutes) {
    return `Opens at ${formatTime(todayHours.open)}`;
  } else if (currentMinutes < closeMinutes) {
    return `Open until ${formatTime(todayHours.close)}`;
  } else {
    return "Closed for today";
  }
}

// Format hours for display
function formatHoursForDisplay(hoursJson: Record<string, HoursEntry>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const day of DAY_ORDER) {
    const hours = hoursJson[day];
    if (!hours?.open || !hours?.close) {
      result[day] = "Closed";
    } else {
      result[day] = `${formatTime(hours.open)} - ${formatTime(hours.close)}`;
    }
  }

  return result;
}

// Build speakable hours summary
function buildHoursSummary(hoursJson: Record<string, HoursEntry>): string {
  const parts: string[] = [];

  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[];
  const weekdayHours = weekdays.map((d) => hoursJson[d]);
  const allWeekdaysSame = weekdayHours.every(
    (h) =>
      h?.open === weekdayHours[0]?.open && h?.close === weekdayHours[0]?.close
  );

  if (allWeekdaysSame && weekdayHours[0]?.open && weekdayHours[0]?.close) {
    parts.push(
      `Monday through Friday we're open ${formatTimeForSpeech(weekdayHours[0].open)} to ${formatTimeForSpeech(weekdayHours[0].close)}`
    );
  } else {
    for (const day of weekdays) {
      const h = hoursJson[day];
      if (h?.open && h?.close) {
        parts.push(`${DAY_LABELS[day]} ${formatTimeForSpeech(h.open)} to ${formatTimeForSpeech(h.close)}`);
      }
    }
  }

  const satHours = hoursJson["saturday"];
  if (satHours?.open && satHours?.close) {
    parts.push(`Saturdays ${formatTimeForSpeech(satHours.open)} to ${formatTimeForSpeech(satHours.close)}`);
  } else {
    parts.push("Saturdays we're closed");
  }

  const sunHours = hoursJson["sunday"];
  if (sunHours?.open && sunHours?.close) {
    parts.push(`Sundays ${formatTimeForSpeech(sunHours.open)} to ${formatTimeForSpeech(sunHours.close)}`);
  } else {
    parts.push("we're closed Sundays");
  }

  return parts.join(", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body: LotInfoRequest = await req.json();
    const { tenant_id, lot_id } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({
          error: "tenant_id is required",
          message: "I'm having trouble looking that up. Let me connect you with someone who can help.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant_id
    let resolvedTenantId = tenant_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenant_id)) {
      console.log(`[get-impound-lot-info] tenant_id "${tenant_id}" is not UUID, looking up by name`);
      const resolved = await resolveTenantByName(SUPABASE_URL, SUPABASE_KEY, tenant_id);
      
      if (!resolved) {
        console.error("[get-impound-lot-info] Could not resolve tenant by name");
        return new Response(
          JSON.stringify({
            error: "Could not identify business",
            message: "I'm having trouble accessing our system. Let me connect you with someone who can help.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      resolvedTenantId = resolved;
      console.log(`[get-impound-lot-info] Resolved "${tenant_id}" to tenant ${resolvedTenantId}`);
    }

    // Fetch lot(s)
    const lots = await fetchImpoundLots(SUPABASE_URL, SUPABASE_KEY, resolvedTenantId, lot_id);

    if (!lots || lots.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No impound lot found",
          message: "I don't have lot information available. Let me connect you with someone who can help.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lot = lots[0];
    const hoursJson: Record<string, HoursEntry> = lot.hours_json || {};

    // Format address
    const addressParts = [lot.address, lot.city, lot.state, lot.zip].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    // Get current status
    const todayName = getCurrentDayName();
    const todayHours = hoursJson[todayName];
    const isOpen = isOpenNow(todayHours);
    const currentStatus = getCurrentStatus(hoursJson);

    // Format hours
    const formattedHours = formatHoursForDisplay(hoursJson);
    const hoursSummary = buildHoursSummary(hoursJson);

    // Build message
    const messageParts: string[] = [];

    if (fullAddress) {
      messageParts.push(`Our impound lot is at ${fullAddress}.`);
    } else if (lot.name) {
      messageParts.push(`Our lot is called ${lot.name}.`);
    }

    if (isOpen && todayHours?.close) {
      messageParts.push(`We're open today until ${formatTime(todayHours.close)}.`);
    } else if (!isOpen && todayHours?.open) {
      const now = new Date();
      const [openHour] = todayHours.open.split(":").map(Number);
      if (now.getHours() < openHour) {
        messageParts.push(`We open today at ${formatTime(todayHours.open)}.`);
      } else {
        messageParts.push(`We're closed for today.`);
      }
    } else {
      messageParts.push(`We're closed today.`);
    }

    messageParts.push(hoursSummary + ".");

    if (lot.phone) {
      messageParts.push(`You can also reach us at ${lot.phone}.`);
    }

    const message = messageParts.join(" ");

    return new Response(
      JSON.stringify({
        lot: {
          id: lot.id,
          name: lot.name,
          address: fullAddress,
          phone: lot.phone,
          is_open_now: isOpen,
          current_status: currentStatus,
        },
        hours: formattedHours,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-impound-lot-info] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        message: "I'm having trouble getting that information right now. Let me connect you with someone who can help.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
