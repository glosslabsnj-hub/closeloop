import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReleaseInfoRequest {
  tenant_id: string;
  vehicle_id: string;
}

interface HoursEntry {
  open: string | null;
  close: string | null;
}

type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const REQUIREMENT_DESCRIPTIONS: Record<string, string> = {
  valid_id: "Valid government-issued photo ID",
  registration: "Vehicle registration or title",
  insurance: "Proof of insurance",
  lien_release: "Lien release from lienholder",
  police_release: "Police release authorization",
  payment: "Payment in full",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  check: "Check",
  money_order: "Money Order",
};

// Format cents to dollars string
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format cents to speakable dollars (e.g., "$330" instead of "$330.00")
function formatCurrencyForSpeech(cents: number): string {
  const dollars = cents / 100;
  if (dollars === Math.floor(dollars)) {
    return `$${Math.floor(dollars)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((date2.getTime() - date1.getTime()) / oneDay));
}

// Get current day name
function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

// Get next day name
function getNextDayName(current: DayOfWeek): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const currentIndex = days.indexOf(current);
  return days[(currentIndex + 1) % 7];
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

// Check if current time is within hours
function isOpenNow(hours: HoursEntry | null, timezone?: string): boolean {
  if (!hours || !hours.open || !hours.close) return false;

  const now = new Date();
  const [openHour, openMin] = hours.open.split(":").map(Number);
  const [closeHour, closeMin] = hours.close.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// Find next open time
function findNextOpen(hoursJson: Record<string, HoursEntry>): string | null {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date().getDay();

  // Check remaining hours today
  const todayName = days[today];
  const todayHours = hoursJson[todayName];
  if (todayHours?.open && todayHours?.close) {
    const now = new Date();
    const [closeHour, closeMin] = todayHours.close.split(":").map(Number);
    const closeMinutes = closeHour * 60 + closeMin;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // If we haven't passed opening time yet today
    const [openHour, openMin] = todayHours.open.split(":").map(Number);
    const openMinutes = openHour * 60 + openMin;
    if (currentMinutes < openMinutes) {
      return `Today at ${formatTime(todayHours.open)}`;
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const checkDay = (today + i) % 7;
    const dayName = days[checkDay];
    const dayHours = hoursJson[dayName];

    if (dayHours?.open) {
      const dayLabel = i === 1 ? "Tomorrow" : dayLabels[checkDay];
      return `${dayLabel} at ${formatTime(dayHours.open)}`;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReleaseInfoRequest = await req.json();
    const { tenant_id, vehicle_id } = body;

    if (!tenant_id || !vehicle_id) {
      return new Response(
        JSON.stringify({
          error: "tenant_id and vehicle_id are required",
          message: "I need more information to look up those details. Can you give me the vehicle information again?",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve tenant_id - it could be a UUID or a business name
    let resolvedTenantId = tenant_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenant_id)) {
      console.log(`[get-impound-release-info] tenant_id "${tenant_id}" is not UUID, looking up by name`);
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .ilike("name", `%${tenant_id}%`)
        .limit(1)
        .maybeSingle();
      
      if (tenantError || !tenant) {
        console.error("[get-impound-release-info] Could not resolve tenant by name:", tenantError);
        return new Response(
          JSON.stringify({
            error: "Could not identify business",
            message: "I'm having trouble accessing our system. Let me connect you with someone who can help.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      resolvedTenantId = tenant.id;
      console.log(`[get-impound-release-info] Resolved "${tenant_id}" to tenant ${resolvedTenantId}`);
    }

    // Load vehicle with lot info
    const { data: vehicle, error: vehicleError } = await supabase
      .from("impound_vehicles")
      .select(`
        *,
        impound_lots (
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          hours_json
        )
      `)
      .eq("id", vehicle_id)
      .eq("tenant_id", resolvedTenantId)
      .single();

    if (vehicleError || !vehicle) {
      console.error("[get-impound-release-info] Vehicle not found:", vehicleError);
      return new Response(
        JSON.stringify({
          error: "Vehicle not found",
          message: "I couldn't find that vehicle in our system. Let me search for it again. What's the license plate number?",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load tenant settings
    const { data: settings, error: settingsError } = await supabase
      .from("impound_settings")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .single();

    // Use defaults if no settings
    const effectiveSettings = settings || {
      base_tow_fee_cents: 15000,
      daily_storage_cents: 3500,
      gate_fee_cents: 5000,
      admin_fee_cents: 2500,
      accepted_payment: ["cash", "credit_card", "debit_card"],
      default_release_requirements: ["valid_id", "registration", "payment"],
      release_hours_json: null,
    };

    // Calculate fees
    const towedAt = new Date(vehicle.towed_at);
    const now = new Date();
    const daysStored = Math.max(1, daysBetween(towedAt, now)); // Minimum 1 day

    const baseTow = vehicle.base_tow_fee_cents || effectiveSettings.base_tow_fee_cents;
    const storagePerDay = vehicle.storage_fee_daily_cents || effectiveSettings.daily_storage_cents;
    const storageTotal = daysStored * storagePerDay;
    const adminFee = vehicle.admin_fee_cents || effectiveSettings.admin_fee_cents;
    const gateFee = vehicle.gate_fee_cents || effectiveSettings.gate_fee_cents;
    const additionalFees = vehicle.additional_fees_cents || 0;
    const totalCents = baseTow + storageTotal + adminFee + gateFee + additionalFees;

    // Update vehicle record if fees changed
    if (
      vehicle.days_stored !== daysStored ||
      vehicle.total_storage_cents !== storageTotal ||
      vehicle.total_fees_cents !== totalCents
    ) {
      await supabase
        .from("impound_vehicles")
        .update({
          days_stored: daysStored,
          total_storage_cents: storageTotal,
          total_fees_cents: totalCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle_id);
    }

    // Get release requirements
    const requirements = (vehicle.release_requirements || effectiveSettings.default_release_requirements || []).map(
      (item: string) => ({
        item,
        description: REQUIREMENT_DESCRIPTIONS[item] || item,
      })
    );

    // Get payment methods
    const paymentMethods = effectiveSettings.accepted_payment || ["cash", "credit_card", "debit_card"];

    // Get lot info and hours
    const lot = vehicle.impound_lots;
    const releaseHours = effectiveSettings.release_hours_json || lot?.hours_json;
    const todayName = getCurrentDayName();
    const todayHours: HoursEntry | null = releaseHours?.[todayName] || null;
    const isOpen = isOpenNow(todayHours);

    // Format hours for today
    let hoursToday = "Closed";
    if (todayHours?.open && todayHours?.close) {
      hoursToday = `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
    }

    // Find next open if currently closed
    let nextOpen: string | null = null;
    if (!isOpen && releaseHours) {
      nextOpen = findNextOpen(releaseHours);
    }

    // Format lot address
    const lotAddressParts = lot
      ? [lot.address, lot.city, lot.state, lot.zip].filter(Boolean)
      : [];
    const lotAddress = lotAddressParts.join(", ");

    // Build speakable message
    const messageParts: string[] = [];

    // Total amount
    messageParts.push(`The total to release your vehicle is ${formatCurrencyForSpeech(totalCents)}.`);

    // Fee breakdown
    const breakdownParts: string[] = [];
    breakdownParts.push(`the ${formatCurrencyForSpeech(baseTow)} tow fee`);
    if (daysStored > 0) {
      breakdownParts.push(`${formatCurrencyForSpeech(storageTotal)} for ${daysStored} day${daysStored > 1 ? "s" : ""} of storage`);
    }
    if (adminFee > 0 || gateFee > 0) {
      breakdownParts.push("fees");
    }
    messageParts.push(`That includes ${breakdownParts.join(" plus ")}.`);

    // Requirements
    const reqDescriptions = requirements
      .filter((r: { item: string }) => r.item !== "payment")
      .map((r: { description: string }) => r.description.toLowerCase().replace("valid ", ""));
    if (reqDescriptions.length > 0) {
      messageParts.push(`You'll need to bring ${reqDescriptions.join(" and ")}.`);
    }

    // Payment methods
    const paymentLabels = paymentMethods.map((m: string) => PAYMENT_METHOD_LABELS[m] || m).join(" or ");
    messageParts.push(`We accept ${paymentLabels.toLowerCase()}.`);

    // Lot hours and location
    if (isOpen) {
      const closeTime = todayHours?.close ? formatTime(todayHours.close) : "close";
      messageParts.push(`The lot is open today until ${closeTime}`);
      if (lotAddress) {
        messageParts.push(`and is located at ${lotAddress}.`);
      }
    } else {
      if (nextOpen) {
        messageParts.push(`The lot is currently closed but opens ${nextOpen.toLowerCase()}.`);
      } else {
        messageParts.push(`The lot is currently closed.`);
      }
      if (lotAddress) {
        messageParts.push(`Would you like the address so you know where to go? It's at ${lotAddress}.`);
      }
    }

    const message = messageParts.join(" ");

    return new Response(
      JSON.stringify({
        vehicle_id,
        fees: {
          base_tow: baseTow,
          storage_days: daysStored,
          storage_per_day: storagePerDay,
          storage_total: storageTotal,
          admin_fee: adminFee,
          gate_fee: gateFee,
          additional_fees: additionalFees,
          total_cents: totalCents,
          total_formatted: formatCurrency(totalCents),
        },
        requirements,
        payment_methods: paymentMethods,
        lot: lot
          ? {
              name: lot.name,
              address: lotAddress,
              phone: lot.phone,
              is_open_now: isOpen,
              hours_today: hoursToday,
              next_open: nextOpen,
            }
          : null,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-impound-release-info] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        message: "I'm having trouble getting that information. Let me connect you with someone who can help.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
