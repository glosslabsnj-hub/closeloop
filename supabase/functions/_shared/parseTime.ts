/**
 * Shared time parser for all booking-related edge functions.
 *
 * Handles natural language time inputs from ElevenLabs voice agent and SMS.
 * Critical rule: ambiguous times (no AM/PM) default to business hours (PM for 1-7).
 */

/**
 * Parse a time string into 24-hour HH:MM format.
 *
 * Handles:
 *   "4:45 pm"  → "16:45"
 *   "9am"      → "09:00"
 *   "14:30"    → "14:30"
 *   "4:45"     → "16:45"  (ambiguous → PM for hours 1-7)
 *   "10:00"    → "10:00"  (unambiguous morning)
 *   "4"        → "16:00"  (bare hour, PM for 1-7)
 *   "10"       → "10:00"
 */
export function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();

  // 1. Explicit AM/PM — "4:45 pm", "9am", "10:30 AM"
  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3].replace(/\./g, "");

    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  // 2. 24-hour format — "14:30", "16:45" (hour >= 13 is unambiguous)
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    const hour = parseInt(h, 10);

    if (hour >= 13) {
      // Unambiguous 24-hour time
      return `${h.padStart(2, "0")}:${m}`;
    }

    // Ambiguous HH:MM without AM/PM — apply business-hours heuristic:
    // Hours 1-7 are almost certainly PM (no business books at 4:45 AM)
    // Hours 8-12 stay as-is (morning business hours)
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:${m}`;
  }

  // 3. Bare hour number — "4", "10"
  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    if (hour >= 13 && hour <= 23) {
      return `${String(hour).padStart(2, "0")}:00`;
    }
    // Hours 1-7 → PM, 8-12 → AM (business hours)
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:00`;
  }

  // 4. Fallback — cannot parse
  console.warn(`[parseTime] Unable to parse time: "${input}", defaulting to 09:00`);
  return "09:00";
}
