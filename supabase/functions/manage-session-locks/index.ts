import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

/**
 * Manage session-based slot locks during AI calls
 *
 * Actions:
 * - extend: Extend lock TTL for a session (keep-alive during long calls)
 * - release: Release all locks when session ends without booking
 * - confirm: Convert a lock to a confirmed booking
 */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const supabase = serviceClient();

    const { action, session_id, ...params } = await req.json();

    if (!session_id) {
      return errorResponse("session_id is required", 400);
    }

    let result;

    switch (action) {
      case "extend": {
        // Extend all locks for a session (keep-alive during call)
        const extendMinutes = params.extend_minutes || 10;
        const { data, error } = await supabase.rpc("fn_extend_session_locks", {
          _session_id: session_id,
          _extend_minutes: extendMinutes,
        });

        if (error) throw error;

        result = {
          success: true,
          action: "extend",
          extended_count: data,
          new_expiry_minutes: extendMinutes,
        };
        break;
      }

      case "release": {
        // Release all locks when session ends without booking
        const { data, error } = await supabase.rpc("fn_release_session_locks", {
          _session_id: session_id,
        });

        if (error) throw error;

        result = {
          success: true,
          action: "release",
          released_count: data,
        };
        break;
      }

      case "confirm": {
        // Convert a specific slot lock to a confirmed booking
        const { slot_start, slot_end, customer_id, service_id, notes } = params;

        if (!slot_start || !slot_end) {
          return errorResponse("slot_start and slot_end are required for confirm action", 400);
        }

        const { data, error } = await supabase.rpc("fn_confirm_slot_from_session", {
          _session_id: session_id,
          _slot_start: slot_start,
          _slot_end: slot_end,
          _customer_id: customer_id || null,
          _service_id: service_id || null,
          _notes: notes || null,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          result = {
            success: row.success,
            action: "confirm",
            booking_id: row.booking_id,
            error_message: row.error_message,
          };
        } else {
          result = {
            success: false,
            action: "confirm",
            error_message: "No result returned from confirmation",
          };
        }
        break;
      }

      default:
        return errorResponse(`Unknown action: ${action}. Valid actions: extend, release, confirm`, 400);
    }

    return jsonResponse(result);
  } catch (error: unknown) {
    console.error("Error in manage-session-locks:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
