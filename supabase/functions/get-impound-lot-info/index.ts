// v2.0.0 - Lightweight fetch-based implementation to avoid cold-start timeouts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LotInfoRequest {
  tenant_id: string;
  lot_id?: string;
  tenant_timezone?: string;
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

// Get current time parts in a specific timezone
function getNowInTimezone(tz: string): { dayIndex: number; hours: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayIndex: dayMap[weekday] ?? new Date().getDay(), hours: hour === 24 ? 0 : hour, minutes: minute };
}

// Get current day name
function getCurrentDayName(tz?: string): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (tz) {
    const { dayIndex } = getNowInTimezone(tz);
    return days[dayIndex];
  }
  return days[new Date().getDay()];
}

// Check if current time is within hours
function isOpenNow(hours: HoursEntry | null, tz?: string): boolean {
  if (!hours || !hours.open || !hours.close) return false;

  const { hours: nowH, minutes: nowM } = tz ? getNowInTimezone(tz) : { hours: new Date().getHours(), minutes: new Date().getMinutes() };
  const [openHour, openMin] = hours.open.split(":").map(Number);
  const [closeHour, closeMin] = hours.close.split(":").map(Number);

  const currentMinutes = nowH * 60 + nowM;
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// Get current status message
function getCurrentStatus(hoursJson: Record<string, HoursEntry>, tz?: string): string {
  const todayName = getCurrentDayName(tz);
  const todayHours = hoursJson[todayName];

  if (!todayHours?.open || !todayHours?.close) {
    return "Closed today";
  }

  const { hours: nowH, minutes: nowM } = tz ? getNowInTimezone(tz) : { hours: new Date().getHours(), minutes: new Date().getMinutes() };
  const [openHour, openMin] = todayHours.open.split(":").map(Number);
  const [closeHour, closeMin] = todayHours.close.split(":").map(Number);

  const currentMinutes = nowH * 60 + nowM;
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

  // Auth: require Authorization header (service key or JWT from ElevenLabs tools)
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "I'm having trouble accessing the system." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body: LotInfoRequest = await req.json();
    const { tenant_id, lot_id, tenant_timezone } = body;

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

    // Resolve timezone from param or tenant record
    let tz = tenant_timezone || "";
    if (!tz) {
      try {
        const tzResp = await fetch(
          `${SUPABASE_URL}/rest/v1/tenants?id=eq.${resolvedTenantId}&select=timezone`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" } }
        );
        if (tzResp.ok) {
          const tzData = await tzResp.json();
          tz = tzData?.[0]?.timezone || "";
        }
      } catch { /* continue without timezone */ }
    }
    const effectiveTz = tz || undefined;

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
    const todayName = getCurrentDayName(effectiveTz);
    const todayHours = hoursJson[todayName];
    const isOpen = isOpenNow(todayHours, effectiveTz);
    const currentStatus = getCurrentStatus(hoursJson, effectiveTz);

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
      const { hours: nowH } = effectiveTz ? getNowInTimezone(effectiveTz) : { hours: new Date().getHours() };
      const [openHour] = todayHours.open.split(":").map(Number);
      if (nowH < openHour) {
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
