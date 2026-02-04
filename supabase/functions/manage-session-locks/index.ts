import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Manage session-based slot locks during AI calls
 *
 * Actions:
 * - extend: Extend lock TTL for a session (keep-alive during long calls)
 * - release: Release all locks when session ends without booking
 * - confirm: Convert a lock to a confirmed booking
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, session_id, ...params } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          return new Response(
            JSON.stringify({ error: "slot_start and slot_end are required for confirm action" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
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
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: extend, release, confirm` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in manage-session-locks:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
