/**
 * Format booking times in the tenant's timezone (not the browser's).
 * Bookings are stored as UTC in the database. Without explicit timezone
 * conversion, date-fns format() displays them in the browser's local timezone,
 * which causes offset bugs when the tenant is in a different timezone.
 */

/**
 * Format a UTC date string for display in the tenant's timezone.
 * Falls back to browser timezone if no timezone is provided.
 */
export function formatInTenantTz(
  utcDateStr: string,
  timezone: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcDateStr);
  return date.toLocaleString("en-US", {
    ...options,
    timeZone: timezone || undefined,
  });
}

/** e.g. "Wed, Mar 5" */
export function formatBookingDate(utcDateStr: string, timezone?: string): string {
  return formatInTenantTz(utcDateStr, timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** e.g. "10:00 AM" */
export function formatBookingTime(utcDateStr: string, timezone?: string): string {
  return formatInTenantTz(utcDateStr, timezone, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "Wednesday, March 5, 2026" */
export function formatBookingDateLong(utcDateStr: string, timezone?: string): string {
  return formatInTenantTz(utcDateStr, timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "Mar 5, 10:00 AM" */
export function formatBookingDatetime(utcDateStr: string, timezone?: string): string {
  return formatInTenantTz(utcDateStr, timezone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
