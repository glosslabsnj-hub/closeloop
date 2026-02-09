/**
 * Centralized error message handling for user-friendly error display.
 *
 * Usage:
 * import { getErrorMessage, ErrorCode } from "@/lib/errorMessages";
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   toast({ variant: "destructive", ...getErrorMessage(error) });
 * }
 */

export type ErrorCode =
  // Authentication errors
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_EMAIL_NOT_VERIFIED"
  | "AUTH_RATE_LIMITED"
  // Tenant/Business errors
  | "TENANT_NOT_FOUND"
  | "TENANT_ALREADY_EXISTS"
  | "TENANT_SUBSCRIPTION_REQUIRED"
  // Phone/Twilio errors
  | "PHONE_ALREADY_IN_USE"
  | "PHONE_INVALID_FORMAT"
  | "PHONE_PROVISION_FAILED"
  | "PHONE_NOT_CONNECTED"
  // Calendar errors
  | "CALENDAR_CONNECTION_FAILED"
  | "CALENDAR_SYNC_FAILED"
  | "CALENDAR_SLOT_UNAVAILABLE"
  // Booking errors
  | "BOOKING_SLOT_TAKEN"
  | "BOOKING_OUTSIDE_HOURS"
  | "BOOKING_SERVICE_NOT_FOUND"
  // Webhook errors
  | "WEBHOOK_DELIVERY_FAILED"
  | "WEBHOOK_INVALID_URL"
  // File/Upload errors
  | "FILE_TOO_LARGE"
  | "FILE_INVALID_TYPE"
  | "FILE_UPLOAD_FAILED"
  // Generic errors
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

interface ErrorInfo {
  title: string;
  description: string;
  suggestion?: string;
  code: ErrorCode;
}

const errorMessages: Record<ErrorCode, Omit<ErrorInfo, "code">> = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: {
    title: "Invalid login",
    description: "The email or password you entered is incorrect.",
    suggestion: "Double-check your credentials or try resetting your password.",
  },
  AUTH_SESSION_EXPIRED: {
    title: "Session expired",
    description: "Your session has expired. Please log in again.",
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    title: "Email not verified",
    description: "Please check your email and click the verification link.",
    suggestion: "Didn't receive it? Check your spam folder or request a new link.",
  },
  AUTH_RATE_LIMITED: {
    title: "Too many attempts",
    description: "You've made too many login attempts. Please wait a few minutes.",
  },

  // Tenant/Business errors
  TENANT_NOT_FOUND: {
    title: "Business not found",
    description: "We couldn't find your business profile.",
    suggestion: "You may need to complete the onboarding process first.",
  },
  TENANT_ALREADY_EXISTS: {
    title: "Business already exists",
    description: "A business with this information is already registered.",
  },
  TENANT_SUBSCRIPTION_REQUIRED: {
    title: "Subscription required",
    description: "You need an active subscription to use this feature.",
    suggestion: "Visit your settings to choose a plan.",
  },

  // Phone/Twilio errors
  PHONE_ALREADY_IN_USE: {
    title: "Phone number in use",
    description: "This phone number is already connected to another business.",
    suggestion: "Try a different number or contact support if this is your number.",
  },
  PHONE_INVALID_FORMAT: {
    title: "Invalid phone number",
    description: "Please enter a valid phone number including country code.",
    suggestion: "Format: +1 (555) 123-4567",
  },
  PHONE_PROVISION_FAILED: {
    title: "Phone setup failed",
    description: "We couldn't provision your phone number.",
    suggestion: "Please try again or contact support if the issue persists.",
  },
  PHONE_NOT_CONNECTED: {
    title: "Phone not connected",
    description: "You need to connect a phone number first.",
    suggestion: "Go to the Go Live page to set up your phone.",
  },

  // Calendar errors
  CALENDAR_CONNECTION_FAILED: {
    title: "Calendar connection failed",
    description: "We couldn't connect to your calendar.",
    suggestion: "Make sure you've granted the necessary permissions.",
  },
  CALENDAR_SYNC_FAILED: {
    title: "Calendar sync failed",
    description: "We couldn't sync your calendar events.",
    suggestion: "Try disconnecting and reconnecting your calendar.",
  },
  CALENDAR_SLOT_UNAVAILABLE: {
    title: "Time slot unavailable",
    description: "This time slot has already been booked.",
    suggestion: "Please choose a different time.",
  },

  // Booking errors
  BOOKING_SLOT_TAKEN: {
    title: "Slot already taken",
    description: "Someone else just booked this time slot.",
    suggestion: "Please select a different available time.",
  },
  BOOKING_OUTSIDE_HOURS: {
    title: "Outside business hours",
    description: "This time is outside your business hours.",
    suggestion: "Check your hours in Business Brain settings.",
  },
  BOOKING_SERVICE_NOT_FOUND: {
    title: "Service not found",
    description: "The requested service doesn't exist.",
    suggestion: "It may have been removed. Please select a different service.",
  },

  // Webhook errors
  WEBHOOK_DELIVERY_FAILED: {
    title: "Webhook delivery failed",
    description: "We couldn't deliver data to your webhook endpoint.",
    suggestion: "Check that your webhook URL is correct and responding.",
  },
  WEBHOOK_INVALID_URL: {
    title: "Invalid webhook URL",
    description: "The webhook URL you entered is not valid.",
    suggestion: "Make sure it starts with https:// and is a complete URL.",
  },

  // File/Upload errors
  FILE_TOO_LARGE: {
    title: "File too large",
    description: "The file you're trying to upload exceeds the size limit.",
    suggestion: "Maximum file size is 10MB. Try compressing or splitting the file.",
  },
  FILE_INVALID_TYPE: {
    title: "Invalid file type",
    description: "This file type is not supported.",
    suggestion: "Supported formats: PDF, DOC, DOCX, TXT, CSV",
  },
  FILE_UPLOAD_FAILED: {
    title: "Upload failed",
    description: "We couldn't upload your file.",
    suggestion: "Check your internet connection and try again.",
  },

  // Generic errors
  NETWORK_ERROR: {
    title: "Couldn't connect",
    description: "Check your internet?",
    suggestion: "We're having trouble reaching our servers.",
  },
  SERVER_ERROR: {
    title: "Something went wrong",
    description: "Try again?",
    suggestion: "If this keeps happening, contact support.",
  },
  VALIDATION_ERROR: {
    title: "Please check this field",
    description: "Something doesn't look right.",
  },
  UNKNOWN_ERROR: {
    title: "Something went wrong",
    description: "Try again?",
    suggestion: "If this continues, contact support.",
  },
};

/**
 * Maps common error messages/codes to our error codes
 */
function detectErrorCode(error: unknown): ErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Auth errors
    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      return "AUTH_INVALID_CREDENTIALS";
    }
    if (message.includes("session") && message.includes("expired")) {
      return "AUTH_SESSION_EXPIRED";
    }
    if (message.includes("rate limit") || message.includes("too many")) {
      return "AUTH_RATE_LIMITED";
    }

    // Phone errors
    if (message.includes("phone") && message.includes("already")) {
      return "PHONE_ALREADY_IN_USE";
    }
    if (message.includes("invalid") && message.includes("phone")) {
      return "PHONE_INVALID_FORMAT";
    }

    // Calendar errors
    if (message.includes("calendar") && message.includes("connect")) {
      return "CALENDAR_CONNECTION_FAILED";
    }

    // Booking errors
    if (message.includes("slot") && (message.includes("taken") || message.includes("unavailable"))) {
      return "BOOKING_SLOT_TAKEN";
    }

    // Network errors
    if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
      return "NETWORK_ERROR";
    }

    // Server errors
    if (message.includes("500") || message.includes("server error")) {
      return "SERVER_ERROR";
    }
  }

  // Check for Supabase error codes
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.code === "23505") {
      // PostgreSQL unique violation
      return "TENANT_ALREADY_EXISTS";
    }
    if (err.code === "PGRST116") {
      // Row not found
      return "TENANT_NOT_FOUND";
    }
  }

  return "UNKNOWN_ERROR";
}

/**
 * Get a user-friendly error message for display.
 *
 * @param error - The caught error (Error, string, or unknown)
 * @param fallbackCode - Optional fallback error code if detection fails
 * @returns Object with title, description, and optional suggestion
 */
export function getErrorMessage(
  error: unknown,
  fallbackCode?: ErrorCode
): ErrorInfo {
  const code = fallbackCode || detectErrorCode(error);
  const info = errorMessages[code];

  return {
    ...info,
    code,
  };
}

/**
 * Get error message by code directly.
 * Useful when you know the specific error type.
 */
export function getErrorByCode(code: ErrorCode): ErrorInfo {
  return {
    ...errorMessages[code],
    code,
  };
}

/**
 * Format error for toast display.
 * Returns { title, description } ready for shadcn toast.
 */
export function formatErrorForToast(error: unknown, fallbackCode?: ErrorCode): {
  title: string;
  description: string;
} {
  const info = getErrorMessage(error, fallbackCode);
  return {
    title: info.title,
    description: info.suggestion
      ? `${info.description} ${info.suggestion}`
      : info.description,
  };
}
