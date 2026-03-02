import type { BusinessHours, DayHours, TimeWindow } from "@/components/onboarding/BusinessHoursEditor";

/**
 * Helper to create a DayHours object with proper windows format
 */
export function createDayHours(open: string, close: string, closed: boolean = false): DayHours {
  return {
    closed,
    windows: closed ? [] : [{ open, close }],
  };
}

/**
 * Default business hours (9-5 weekdays, 10-2 Sat, closed Sun)
 */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: createDayHours("09:00", "17:00"),
  tuesday: createDayHours("09:00", "17:00"),
  wednesday: createDayHours("09:00", "17:00"),
  thursday: createDayHours("09:00", "17:00"),
  friday: createDayHours("09:00", "17:00"),
  saturday: createDayHours("10:00", "14:00"),
  sunday: createDayHours("00:00", "00:00", true),
};

/**
 * Restaurant hours preset (11-22 weekdays, 11-23 Fri/Sat, 12-21 Sun)
 */
export const RESTAURANT_HOURS: BusinessHours = {
  monday: createDayHours("11:00", "22:00"),
  tuesday: createDayHours("11:00", "22:00"),
  wednesday: createDayHours("11:00", "22:00"),
  thursday: createDayHours("11:00", "22:00"),
  friday: createDayHours("11:00", "23:00"),
  saturday: createDayHours("11:00", "23:00"),
  sunday: createDayHours("12:00", "21:00"),
};

/**
 * Restaurant with lunch break (split shift) preset
 * Morning: 7am-11am, Evening: 5pm-10pm
 */
export const RESTAURANT_SPLIT_HOURS: BusinessHours = {
  monday: { closed: false, windows: [{ open: "07:00", close: "11:00" }, { open: "17:00", close: "22:00" }] },
  tuesday: { closed: false, windows: [{ open: "07:00", close: "11:00" }, { open: "17:00", close: "22:00" }] },
  wednesday: { closed: false, windows: [{ open: "07:00", close: "11:00" }, { open: "17:00", close: "22:00" }] },
  thursday: { closed: false, windows: [{ open: "07:00", close: "11:00" }, { open: "17:00", close: "22:00" }] },
  friday: { closed: false, windows: [{ open: "07:00", close: "11:00" }, { open: "17:00", close: "23:00" }] },
  saturday: { closed: false, windows: [{ open: "08:00", close: "12:00" }, { open: "17:00", close: "23:00" }] },
  sunday: { closed: false, windows: [{ open: "09:00", close: "14:00" }] },
};

/**
 * 24/7 hours preset
 */
export const HOURS_24_7: BusinessHours = {
  monday: createDayHours("00:00", "23:59"),
  tuesday: createDayHours("00:00", "23:59"),
  wednesday: createDayHours("00:00", "23:59"),
  thursday: createDayHours("00:00", "23:59"),
  friday: createDayHours("00:00", "23:59"),
  saturday: createDayHours("00:00", "23:59"),
  sunday: createDayHours("00:00", "23:59"),
};

/**
 * 9-5 weekdays closed weekends
 */
export const TYPICAL_BUSINESS_HOURS: BusinessHours = {
  monday: createDayHours("09:00", "17:00"),
  tuesday: createDayHours("09:00", "17:00"),
  wednesday: createDayHours("09:00", "17:00"),
  thursday: createDayHours("09:00", "17:00"),
  friday: createDayHours("09:00", "17:00"),
  saturday: createDayHours("09:00", "17:00", true),
  sunday: createDayHours("09:00", "17:00", true),
};

/**
 * Mon-Sat 9-5, closed Sunday
 */
export const MON_SAT_9_5: BusinessHours = {
  monday: createDayHours("09:00", "17:00"),
  tuesday: createDayHours("09:00", "17:00"),
  wednesday: createDayHours("09:00", "17:00"),
  thursday: createDayHours("09:00", "17:00"),
  friday: createDayHours("09:00", "17:00"),
  saturday: createDayHours("09:00", "17:00"),
  sunday: createDayHours("09:00", "17:00", true),
};

/**
 * 7 days 9-5
 */
export const SEVEN_DAYS_9_5: BusinessHours = {
  monday: createDayHours("09:00", "17:00"),
  tuesday: createDayHours("09:00", "17:00"),
  wednesday: createDayHours("09:00", "17:00"),
  thursday: createDayHours("09:00", "17:00"),
  friday: createDayHours("09:00", "17:00"),
  saturday: createDayHours("09:00", "17:00"),
  sunday: createDayHours("09:00", "17:00"),
};

/**
 * Mon-Fri 8-6 (longer day, common for service businesses)
 */
export const MON_FRI_8_6: BusinessHours = {
  monday: createDayHours("08:00", "18:00"),
  tuesday: createDayHours("08:00", "18:00"),
  wednesday: createDayHours("08:00", "18:00"),
  thursday: createDayHours("08:00", "18:00"),
  friday: createDayHours("08:00", "18:00"),
  saturday: createDayHours("08:00", "18:00", true),
  sunday: createDayHours("08:00", "18:00", true),
};

/**
 * Named hour presets for the quick-select UI
 */
export interface HoursPreset {
  id: string;
  label: string;
  sublabel: string;
  hours: BusinessHours;
}

export const HOURS_PRESETS: HoursPreset[] = [
  {
    id: "mon_fri_9_5",
    label: "Mon–Fri",
    sublabel: "9am – 5pm",
    hours: TYPICAL_BUSINESS_HOURS,
  },
  {
    id: "mon_sat_9_5",
    label: "Mon–Sat",
    sublabel: "9am – 5pm",
    hours: MON_SAT_9_5,
  },
  {
    id: "7_days_9_5",
    label: "7 days",
    sublabel: "9am – 5pm",
    hours: SEVEN_DAYS_9_5,
  },
  {
    id: "mon_fri_8_6",
    label: "Mon–Fri",
    sublabel: "8am – 6pm",
    hours: MON_FRI_8_6,
  },
];

/**
 * Format time window(s) for display
 */
export function formatWindowsForDisplay(windows: TimeWindow[]): string {
  if (!windows || windows.length === 0) return "Closed";
  
  return windows.map(w => {
    const formatTime = (time: string) => {
      if (time === "23:59") return "midnight";
      if (time === "00:00") return "midnight";
      const [hours, minutes] = time.split(":");
      const h = parseInt(hours);
      const suffix = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayHour}:${minutes} ${suffix}`;
    };
    return `${formatTime(w.open)} - ${formatTime(w.close)}`;
  }).join(", ");
}

/**
 * Get today's hours preview for AI
 */
export function getTodayHoursPreview(hours: BusinessHours): string {
  // Check 24/7 first — avoids awkward "open today midnight - midnight"
  if (getIs24x7(hours)) {
    return "We're available 24/7.";
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  const todayHours = hours[today];

  if (!todayHours || todayHours.closed || todayHours.windows.length === 0) {
    return "We're closed today.";
  }

  // Single window covering entire day (but not all 7 days) → "open 24 hours today"
  if (
    todayHours.windows.length === 1 &&
    todayHours.windows[0].open === "00:00" &&
    todayHours.windows[0].close === "23:59"
  ) {
    return "We're open 24 hours today.";
  }

  const windowsText = formatWindowsForDisplay(todayHours.windows);
  return `We're open today ${windowsText}.`;
}

/**
 * Check if hours represent 24/7 availability
 */
export function getIs24x7(hours: BusinessHours): boolean {
  return Object.values(hours).every(
    day => !day.closed && 
           day.windows.length === 1 && 
           day.windows[0].open === "00:00" && 
           day.windows[0].close === "23:59"
  );
}
