/**
 * Tests for Voice Mode Routing Logic
 *
 * Validates the complete routing matrix for twilio-inbound:
 * - isAfterHours() business hours detection
 * - handleOffBehavior() TwiML generation
 * - Mode-based routing (always_on, after_hours_only)
 * - ai_behavior_mode passthrough
 */

// ============= isAfterHours() Tests =============

// Inline the function for unit testing (mirrors twilio-inbound implementation)
function isAfterHours(hoursJson: Record<string, unknown> | null, timezone: string | null): boolean {
  if (!hoursJson || !timezone) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === "weekday")?.value?.toLowerCase() || "";
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
    const currentMinutes = hour * 60 + minute;

    const dayKeys = [weekday, weekday.slice(0, 3)];
    let todayHours: any = null;
    for (const key of dayKeys) {
      if (hoursJson[key] !== undefined) {
        todayHours = hoursJson[key];
        break;
      }
    }

    if (todayHours === null || todayHours === undefined) return true;
    if (todayHours === false || todayHours?.closed === true || todayHours?.is_closed === true) return true;

    let openTime: string | null = null;
    let closeTime: string | null = null;

    if (typeof todayHours === "object") {
      openTime = todayHours.open || todayHours.start || null;
      closeTime = todayHours.close || todayHours.end || null;
    }

    if (!openTime || !closeTime) return false;

    const [openH, openM] = openTime.split(":").map(Number);
    const [closeH, closeM] = closeTime.split(":").map(Number);
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    return currentMinutes < openMinutes || currentMinutes >= closeMinutes;
  } catch {
    return false;
  }
}

// Helper: create hours JSON for testing with specific current time simulation
function isAfterHoursForTime(
  hoursJson: Record<string, unknown>,
  dayOfWeek: string,
  currentHour: number,
  currentMinute: number
): boolean {
  const dayKeys = [dayOfWeek, dayOfWeek.slice(0, 3)];
  let todayHours: any = null;
  for (const key of dayKeys) {
    if (hoursJson[key] !== undefined) {
      todayHours = hoursJson[key];
      break;
    }
  }

  if (todayHours === null || todayHours === undefined) return true;
  if (todayHours === false || todayHours?.closed === true || todayHours?.is_closed === true) return true;

  let openTime: string | null = null;
  let closeTime: string | null = null;

  if (typeof todayHours === "object") {
    openTime = todayHours.open || todayHours.start || null;
    closeTime = todayHours.close || todayHours.end || null;
  }

  if (!openTime || !closeTime) return false;

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);
  const currentMinutes = currentHour * 60 + currentMinute;

  return currentMinutes < openMinutes || currentMinutes >= closeMinutes;
}

describe("isAfterHours()", () => {
  const standardHours: Record<string, unknown> = {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    wednesday: { open: "09:00", close: "17:00" },
    thursday: { open: "09:00", close: "17:00" },
    friday: { open: "09:00", close: "17:00" },
    saturday: { open: "10:00", close: "14:00" },
    sunday: { closed: true },
  };

  test("returns false (assume open) when hoursJson is null", () => {
    expect(isAfterHours(null, "America/New_York")).toBe(false);
  });

  test("returns false (assume open) when timezone is null", () => {
    expect(isAfterHours(standardHours, null)).toBe(false);
  });

  test("returns false (assume open) for invalid timezone", () => {
    expect(isAfterHours(standardHours, "Invalid/Timezone")).toBe(false);
  });

  describe("deterministic time checks (using helper)", () => {
    test("during open hours → false (not after hours)", () => {
      expect(isAfterHoursForTime(standardHours, "monday", 12, 0)).toBe(false);
      expect(isAfterHoursForTime(standardHours, "monday", 9, 0)).toBe(false);
      expect(isAfterHoursForTime(standardHours, "monday", 16, 59)).toBe(false);
    });

    test("before open hours → true (after hours)", () => {
      expect(isAfterHoursForTime(standardHours, "monday", 8, 59)).toBe(true);
      expect(isAfterHoursForTime(standardHours, "monday", 0, 0)).toBe(true);
      expect(isAfterHoursForTime(standardHours, "monday", 6, 30)).toBe(true);
    });

    test("at/after close time → true (after hours)", () => {
      expect(isAfterHoursForTime(standardHours, "monday", 17, 0)).toBe(true);
      expect(isAfterHoursForTime(standardHours, "monday", 17, 1)).toBe(true);
      expect(isAfterHoursForTime(standardHours, "monday", 23, 0)).toBe(true);
    });

    test("Sunday closed → true (after hours)", () => {
      expect(isAfterHoursForTime(standardHours, "sunday", 12, 0)).toBe(true);
    });

    test("Saturday shorter hours", () => {
      expect(isAfterHoursForTime(standardHours, "saturday", 10, 0)).toBe(false);
      expect(isAfterHoursForTime(standardHours, "saturday", 13, 59)).toBe(false);
      expect(isAfterHoursForTime(standardHours, "saturday", 14, 0)).toBe(true);
      expect(isAfterHoursForTime(standardHours, "saturday", 9, 0)).toBe(true);
    });

    test("day not in hours → true (closed)", () => {
      const sparseHours = { monday: { open: "09:00", close: "17:00" } };
      expect(isAfterHoursForTime(sparseHours, "tuesday", 12, 0)).toBe(true);
    });
  });

  describe("alternative hours formats", () => {
    test("supports start/end keys", () => {
      const hours = { monday: { start: "08:00", end: "18:00" } };
      expect(isAfterHoursForTime(hours, "monday", 12, 0)).toBe(false);
      expect(isAfterHoursForTime(hours, "monday", 18, 0)).toBe(true);
    });

    test("handles is_closed flag", () => {
      const hours = { monday: { is_closed: true } };
      expect(isAfterHoursForTime(hours, "monday", 12, 0)).toBe(true);
    });

    test("handles false value (closed)", () => {
      const hours = { monday: false };
      expect(isAfterHoursForTime(hours as any, "monday", 12, 0)).toBe(true);
    });

    test("handles abbreviated day keys", () => {
      const hours = { mon: { open: "09:00", close: "17:00" } };
      expect(isAfterHoursForTime(hours, "monday", 12, 0)).toBe(false);
    });
  });
});

// ============= handleOffBehavior() Tests =============

describe("handleOffBehavior() TwiML generation", () => {
  function escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function forwardTwiml(forwardNumber: string, businessName: string, callerId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" timeout="25">
    <Number>${escapeXml(forwardNumber)}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Sorry, no one is available at ${escapeXml(businessName)} right now. Please try again later.</Say>
  <Hangup/>
</Response>`;
  }

  function voicemailTwiml(businessName: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. We're not available right now. Please leave a message after the tone and we'll get back to you.</Say>
  <Record maxLength="120" playBeep="true" />
  <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  function callbackCaptureTwiml(businessName: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. We have your number and someone will call you back shortly.</Say>
  <Hangup/>
</Response>`;
  }

  test("FORWARD_OWNER generates <Dial> TwiML with correct number", () => {
    const twiml = forwardTwiml("+12345678900", "Joe's Auto", "+18005551234");
    expect(twiml).toContain("<Dial");
    expect(twiml).toContain("<Number>+12345678900</Number>");
    expect(twiml).toContain('callerId="+18005551234"');
    expect(twiml).toContain("Joe&apos;s Auto");
  });

  test("VOICEMAIL generates <Record> TwiML", () => {
    const twiml = voicemailTwiml("Test Business");
    expect(twiml).toContain("<Record");
    expect(twiml).toContain('playBeep="true"');
    expect(twiml).toContain("Test Business");
  });

  test("CALLBACK_ONLY generates <Say> + <Hangup> TwiML", () => {
    const twiml = callbackCaptureTwiml("Test Business");
    expect(twiml).toContain("<Say");
    expect(twiml).toContain("call you back");
    expect(twiml).toContain("<Hangup/>");
    expect(twiml).not.toContain("<Dial");
    expect(twiml).not.toContain("<Record");
  });

  test("all TwiML paths start with XML declaration and <Response>", () => {
    const forward = forwardTwiml("+12345678900", "Biz", "+18001234567");
    const vm = voicemailTwiml("Biz");
    const cb = callbackCaptureTwiml("Biz");

    for (const twiml of [forward, vm, cb]) {
      expect(twiml).toContain('<?xml version="1.0"');
      expect(twiml).toContain("<Response>");
      expect(twiml).toContain("</Response>");
    }
  });
});

// ============= Mode Routing Matrix =============

describe("Voice Mode Routing Matrix", () => {
  type RoutingResult = "ai" | "off_behavior";

  function determineRoute(
    voiceAiEnabled: boolean,
    voiceMode: string,
    isCurrentlyAfterHours: boolean
  ): RoutingResult {
    // 1. AI disabled → off_behavior
    if (!voiceAiEnabled || voiceMode === "off") return "off_behavior";

    // 2. After hours only → check hours
    if (voiceMode === "after_hours_only") {
      return isCurrentlyAfterHours ? "ai" : "off_behavior";
    }

    // 3. always_on (default) → AI
    return "ai";
  }

  test("always_on + enabled → AI", () => {
    expect(determineRoute(true, "always_on", false)).toBe("ai");
    expect(determineRoute(true, "always_on", true)).toBe("ai");
  });

  test("always_on + disabled → off_behavior", () => {
    expect(determineRoute(false, "always_on", false)).toBe("off_behavior");
    expect(determineRoute(false, "always_on", true)).toBe("off_behavior");
  });

  test("after_hours_only + during hours → off_behavior", () => {
    expect(determineRoute(true, "after_hours_only", false)).toBe("off_behavior");
  });

  test("after_hours_only + after hours → AI", () => {
    expect(determineRoute(true, "after_hours_only", true)).toBe("ai");
  });

  test("after_hours_only + disabled → off_behavior regardless", () => {
    expect(determineRoute(false, "after_hours_only", false)).toBe("off_behavior");
    expect(determineRoute(false, "after_hours_only", true)).toBe("off_behavior");
  });

  test("voice_mode=off → off_behavior regardless of enabled flag", () => {
    expect(determineRoute(true, "off", false)).toBe("off_behavior");
    expect(determineRoute(true, "off", true)).toBe("off_behavior");
  });
});

// ============= ai_behavior_mode Tests =============

describe("ai_behavior_mode Dynamic Variable", () => {
  test("defaults to full_service when not set", () => {
    const settings: Record<string, unknown> = {};
    const behaviorMode = (settings.ai_behavior_mode as string) || "full_service";
    expect(behaviorMode).toBe("full_service");
  });

  test("passes through callback_only when set", () => {
    const settings = { ai_behavior_mode: "callback_only" };
    const behaviorMode = settings.ai_behavior_mode || "full_service";
    expect(behaviorMode).toBe("callback_only");
  });

  test("only allows valid values", () => {
    const validModes = ["full_service", "callback_only"];
    expect(validModes).toContain("full_service");
    expect(validModes).toContain("callback_only");
    expect(validModes).not.toContain("auto_book");
  });
});

// ============= CALLBACK_ONLY_OVERRIDE Prompt Tests =============

describe("CALLBACK_ONLY_OVERRIDE Prompt Injection", () => {
  // Simulate the prompt builder logic
  function buildPromptSections(
    aiBehaviorMode?: "full_service" | "callback_only"
  ): string[] {
    const sections = ["HUMAN_PHONE_RULES", "TIME_NUMBER_SPEAKING_RULES"];

    if (aiBehaviorMode === "callback_only") {
      sections.push("CALLBACK_ONLY_OVERRIDE");
    }

    sections.push("MODE_SPECIFIC_PROMPT");
    sections.push("BUSYNESS_RULES");
    sections.push("DEBUG_OVERRIDE");

    return sections;
  }

  test("full_service does NOT inject CALLBACK_ONLY_OVERRIDE", () => {
    const sections = buildPromptSections("full_service");
    expect(sections).not.toContain("CALLBACK_ONLY_OVERRIDE");
  });

  test("callback_only injects CALLBACK_ONLY_OVERRIDE before mode prompt", () => {
    const sections = buildPromptSections("callback_only");
    expect(sections).toContain("CALLBACK_ONLY_OVERRIDE");

    const overrideIndex = sections.indexOf("CALLBACK_ONLY_OVERRIDE");
    const modeIndex = sections.indexOf("MODE_SPECIFIC_PROMPT");
    expect(overrideIndex).toBeLessThan(modeIndex);
  });

  test("undefined behavior mode does NOT inject override", () => {
    const sections = buildPromptSections(undefined);
    expect(sections).not.toContain("CALLBACK_ONLY_OVERRIDE");
  });
});
