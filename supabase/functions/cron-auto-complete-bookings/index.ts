/**
 * cron-auto-complete-bookings: Auto-complete bookings whose appointment time has passed.
 *
 * Called by pg_cron every 15 minutes. Finds confirmed bookings that ended 2+ hours ago,
 * marks them completed, and triggers the booking-handoff completion chain
 * (thank you SMS, invoice, review request).
 *
 * Idempotent: only touches status='confirmed' bookings, safe to run repeatedly.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_PER_RUN = 50;
const GRACE_HOURS = 2;
const DEFAULT_DURATION_MINUTES = 60;

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results = { checked: 0, completed: 0, handoff_triggered: 0, errors: 0 };

    // Cutoff: appointments that ended at least GRACE_HOURS ago
    const cutoff = new Date(now.getTime() - GRACE_HOURS * 60 * 60 * 1000).toISOString();

    // Query 1: Bookings with end_at set and past the cutoff
    const { data: withEndAt, error: err1 } = await supabase
      .from("bookings")
      .select("id, tenant_id, start_at, end_at, duration_minutes")
      .eq("status", "confirmed")
      .not("end_at", "is", null)
      .lte("end_at", cutoff)
      .order("end_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (err1) {
      console.error("[cron-auto-complete] Error fetching bookings with end_at:", err1);
      return new Response(JSON.stringify({ error: err1.message }), { status: 500 });
    }

    // Query 2: Bookings without end_at — compute effective end from start_at + duration
    // We fetch confirmed bookings with null end_at where start_at is old enough
    // that even with maximum reasonable duration they'd be past the cutoff.
    // We'll filter precisely in code.
    const maxCutoff = new Date(now.getTime() - GRACE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: withoutEndAt, error: err2 } = await supabase
      .from("bookings")
      .select("id, tenant_id, start_at, end_at, duration_minutes")
      .eq("status", "confirmed")
      .is("end_at", null)
      .not("start_at", "is", null)
      .lte("start_at", maxCutoff)
      .order("start_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (err2) {
      console.error("[cron-auto-complete] Error fetching bookings without end_at:", err2);
      return new Response(JSON.stringify({ error: err2.message }), { status: 500 });
    }

    // Filter bookings without end_at: effective end must be before cutoff
    const cutoffMs = new Date(cutoff).getTime();
    const filteredWithoutEndAt = (withoutEndAt || []).filter((b: any) => {
      const durationMin = b.duration_minutes || DEFAULT_DURATION_MINUTES;
      const effectiveEnd = new Date(b.start_at).getTime() + durationMin * 60 * 1000;
      return effectiveEnd <= cutoffMs;
    });

    // Combine and cap at MAX_PER_RUN total
    const allBookings = [...(withEndAt || []), ...filteredWithoutEndAt].slice(0, MAX_PER_RUN);
    results.checked = allBookings.length;

    if (allBookings.length === 0) {
      console.log("[cron-auto-complete] No bookings to complete.");
      return new Response(JSON.stringify({ message: "No bookings to complete", ...results }));
    }

    for (const booking of allBookings) {
      try {
        // Compute effective end_at if missing
        const effectiveEndAt = booking.end_at
          ? booking.end_at
          : new Date(
              new Date(booking.start_at).getTime() +
              (booking.duration_minutes || DEFAULT_DURATION_MINUTES) * 60 * 1000
            ).toISOString();

        // Update status to completed and set end_at if it was null
        const updateFields: Record<string, unknown> = { status: "completed" };
        if (!booking.end_at) {
          updateFields.end_at = effectiveEndAt;
        }

        const { error: updateErr } = await supabase
          .from("bookings")
          .update(updateFields)
          .eq("id", booking.id)
          .eq("status", "confirmed"); // Double-check status to prevent race conditions

        if (updateErr) {
          console.error(`[cron-auto-complete] Failed to update booking ${booking.id}:`, updateErr);
          results.errors++;
          continue;
        }

        results.completed++;
        console.log(`[cron-auto-complete] Completed booking ${booking.id} (tenant ${booking.tenant_id})`);

        // Trigger booking-handoff with event: "completed" for the full post-completion chain
        try {
          const handoffResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/booking-handoff`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || SUPABASE_SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({
                booking_id: booking.id,
                tenant_id: booking.tenant_id,
                event: "completed",
              }),
            }
          );

          if (handoffResponse.ok) {
            results.handoff_triggered++;
            console.log(`[cron-auto-complete] Handoff triggered for booking ${booking.id}`);
          } else {
            const errText = await handoffResponse.text();
            console.error(`[cron-auto-complete] Handoff failed for ${booking.id}: ${handoffResponse.status} ${errText}`);
          }
        } catch (handoffErr) {
          console.error(`[cron-auto-complete] Handoff error for ${booking.id}:`, handoffErr);
        }
      } catch (err) {
        console.error(`[cron-auto-complete] Error processing booking ${booking.id}:`, err);
        results.errors++;
      }
    }

    console.log(`[cron-auto-complete] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-auto-complete] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
