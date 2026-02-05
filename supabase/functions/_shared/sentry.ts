/**
 * Sentry error tracking for Supabase Edge Functions
 *
 * Lightweight Sentry integration that captures errors and sends them
 * to Sentry without requiring the full SDK (not available in Deno).
 *
 * Usage:
 *   import { captureException, captureMessage, withSentry } from "../_shared/sentry.ts";
 *
 *   // Capture an error
 *   captureException(error, { tags: { function: "twilio-inbound" } });
 *
 *   // Capture a message
 *   captureMessage("Important event occurred", "info", { extra: { tenantId } });
 *
 *   // Wrap a handler with automatic error capturing
 *   serve(withSentry("twilio-inbound", async (req) => { ... }));
 */

interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

interface SentryEvent {
  event_id: string;
  timestamp: string;
  platform: string;
  level: string;
  logger: string;
  server_name: string;
  environment: string;
  release?: string;
  message?: { formatted: string };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; lineno?: number; function?: string }> };
    }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
  contexts?: Record<string, unknown>;
}

// Generate a UUID for event IDs
function generateEventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// Parse stack trace from error
function parseStackTrace(
  error: Error
): Array<{ filename: string; lineno?: number; function?: string }> {
  const frames: Array<{ filename: string; lineno?: number; function?: string }> = [];
  const stack = error.stack || "";

  const lines = stack.split("\n").slice(1);
  for (const line of lines) {
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+)(?::(\d+))?\)?/);
    if (match) {
      frames.push({
        function: match[1] || "<anonymous>",
        filename: match[2],
        lineno: parseInt(match[3], 10),
      });
    }
  }

  // Sentry expects frames in reverse order (oldest first)
  return frames.reverse();
}

// Get Sentry DSN from environment
function getSentryDsn(): string | null {
  return Deno.env.get("SENTRY_DSN") || null;
}

// Parse DSN into components
function parseDsn(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace("/", "");
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

// Send event to Sentry
async function sendToSentry(event: SentryEvent): Promise<boolean> {
  const dsn = getSentryDsn();
  if (!dsn) {
    console.warn("[Sentry] DSN not configured - error not reported");
    return false;
  }

  const parsed = parseDsn(dsn);
  if (!parsed) {
    console.error("[Sentry] Invalid DSN format");
    return false;
  }

  const { publicKey, host, projectId } = parsed;
  const endpoint = `https://${host}/api/${projectId}/store/`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=closeloop-edge/1.0, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Sentry] Failed to send event: ${response.status} ${text}`);
      return false;
    }

    console.log(`[Sentry] Event sent: ${event.event_id}`);
    return true;
  } catch (err) {
    console.error("[Sentry] Failed to send event:", err);
    return false;
  }
}

// Build base Sentry event
function buildBaseEvent(context: SentryContext = {}): SentryEvent {
  const environment = Deno.env.get("ENVIRONMENT") || "production";
  const release = Deno.env.get("SENTRY_RELEASE") || undefined;

  return {
    event_id: generateEventId(),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: context.level || "error",
    logger: "closeloop.edge",
    server_name: "supabase-edge",
    environment,
    release,
    tags: context.tags,
    extra: context.extra,
    user: context.user,
    contexts: {
      runtime: {
        name: "deno",
        version: Deno.version.deno,
      },
    },
  };
}

/**
 * Capture an exception and send to Sentry
 */
export async function captureException(
  error: Error | unknown,
  context: SentryContext = {}
): Promise<string | null> {
  const err = error instanceof Error ? error : new Error(String(error));

  const event = buildBaseEvent({ ...context, level: context.level || "error" });
  event.exception = {
    values: [
      {
        type: err.name || "Error",
        value: err.message,
        stacktrace: {
          frames: parseStackTrace(err),
        },
      },
    ],
  };

  // Also log to console for visibility in Supabase logs
  console.error(`[Sentry:${event.event_id}]`, err.message, err.stack);

  const sent = await sendToSentry(event);
  return sent ? event.event_id : null;
}

/**
 * Capture a message and send to Sentry
 */
export async function captureMessage(
  message: string,
  level: SentryContext["level"] = "info",
  context: SentryContext = {}
): Promise<string | null> {
  const event = buildBaseEvent({ ...context, level });
  event.message = { formatted: message };

  console.log(`[Sentry:${event.event_id}] ${level}: ${message}`);

  const sent = await sendToSentry(event);
  return sent ? event.event_id : null;
}

/**
 * Set user context for subsequent error captures
 */
let currentUser: SentryContext["user"] | undefined;
export function setUser(user: SentryContext["user"] | null): void {
  currentUser = user || undefined;
}

/**
 * Set tags that will be included in all events
 */
let globalTags: Record<string, string> = {};
export function setTags(tags: Record<string, string>): void {
  globalTags = { ...globalTags, ...tags };
}

/**
 * Wrapper for edge function handlers that automatically captures errors
 */
export function withSentry(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = generateEventId().substring(0, 8);
    const startTime = Date.now();

    try {
      const response = await handler(req);

      // Log non-2xx responses as warnings
      if (response.status >= 400 && response.status < 500) {
        await captureMessage(`${functionName} returned ${response.status}`, "warning", {
          tags: { ...globalTags, function: functionName, request_id: requestId },
          extra: {
            method: req.method,
            url: req.url,
            status: response.status,
            duration_ms: Date.now() - startTime,
          },
        });
      } else if (response.status >= 500) {
        await captureMessage(`${functionName} returned ${response.status}`, "error", {
          tags: { ...globalTags, function: functionName, request_id: requestId },
          extra: {
            method: req.method,
            url: req.url,
            status: response.status,
            duration_ms: Date.now() - startTime,
          },
        });
      }

      return response;
    } catch (error) {
      // Capture the exception
      await captureException(error, {
        tags: { ...globalTags, function: functionName, request_id: requestId },
        extra: {
          method: req.method,
          url: req.url,
          duration_ms: Date.now() - startTime,
        },
        user: currentUser,
      });

      // Re-throw to let the framework handle it
      throw error;
    }
  };
}

/**
 * Check if Sentry is configured
 */
export function isSentryEnabled(): boolean {
  return !!getSentryDsn();
}
