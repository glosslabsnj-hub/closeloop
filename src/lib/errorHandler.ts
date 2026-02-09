import { toast } from "sonner";

interface ErrorContext {
  component?: string;
  action?: string;
  silent?: boolean;
}

/**
 * Centralized error handler for the CloseLoop frontend.
 *
 * Logs to console, shows toast to user (unless silent), and
 * provides a single place to wire up external error reporting.
 */
export function handleError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const label = context?.component
    ? `[${context.component}] ${context?.action || "Error"}`
    : context?.action || "Error";

  console.error(`${label}:`, error);

  if (!context?.silent) {
    toast.error("Something went wrong", {
      description: message.length > 120 ? `${message.slice(0, 117)}...` : message,
    });
  }
}
