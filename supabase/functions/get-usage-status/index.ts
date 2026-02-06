/**
 * get-usage-status: Returns comprehensive usage status for a tenant
 *
 * SECURITY:
 * - Requires Authorization Bearer JWT with valid tenant membership
 *
 * Returns:
 * - Current billing period usage
 * - Included limits from subscription
 * - Usage percentages
 * - Projected overage charges
 * - Credit balance
 * - Next billing date
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    // Parse tenant_id from query string or body
    const url = new URL(req.url);
    let tenantId = url.searchParams.get("tenant_id");

    if (req.method === "POST") {
      const body = await req.json();
      tenantId = body.tenant_id || tenantId;
    }

    // Validate tenant membership via JWT
    const { tenantId: validatedTenantId } = await requireAuthedTenant(req, tenantId);

    const supabase = serviceClient();
    const now = new Date();

    // Fetch subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", validatedTenantId)
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    // Fetch current billing period usage
    const { data: usageRecord, error: usageError } = await supabase
      .from("subscription_usage")
      .select("*")
      .eq("tenant_id", validatedTenantId)
      .lte("billing_period_start", now.toISOString())
      .gte("billing_period_end", now.toISOString())
      .maybeSingle();

    if (usageError) {
      throw new Error(`Failed to fetch usage: ${usageError.message}`);
    }

    // Extract subscription limits
    const includedMinutes = subscription?.included_minutes ?? 0;
    const includedSmsSegments = subscription?.included_sms_segments ?? 0;
    const overageMinuteRateCents = subscription?.overage_minute_rate_cents ?? 45;
    const overageSmsRateCents = subscription?.overage_sms_rate_cents ?? 3;
    const creditBalanceCents = subscription?.credit_balance_cents ?? 0;
    const planCode = subscription?.plan_code ?? null;
    const subscriptionStatus = subscription?.status ?? "unknown";

    // Extract current usage
    const voiceMinutesUsed = usageRecord?.voice_minutes_used ?? 0;
    const smsSegmentsUsed = usageRecord?.sms_segments_used ?? 0;
    const billingPeriodStart = usageRecord?.billing_period_start ?? null;
    const billingPeriodEnd = usageRecord?.billing_period_end ?? null;

    // Calculate percentages
    const voicePercentUsed = includedMinutes > 0
      ? Math.round((voiceMinutesUsed / includedMinutes) * 100)
      : 0;
    const smsPercentUsed = includedSmsSegments > 0
      ? Math.round((smsSegmentsUsed / includedSmsSegments) * 100)
      : 0;

    // Calculate overage
    const voiceOverageMinutes = Math.max(0, voiceMinutesUsed - includedMinutes);
    const smsOverageSegments = Math.max(0, smsSegmentsUsed - includedSmsSegments);

    // Calculate projected charges
    const voiceOverageChargeCents = voiceOverageMinutes * overageMinuteRateCents;
    const smsOverageChargeCents = smsOverageSegments * overageSmsRateCents;
    const totalOverageChargeCents = voiceOverageChargeCents + smsOverageChargeCents;

    // Calculate how much credit covers
    const creditAppliedCents = Math.min(creditBalanceCents, totalOverageChargeCents);
    const netOverageChargeCents = totalOverageChargeCents - creditAppliedCents;

    // Days remaining in billing period
    let daysRemaining = 0;
    if (billingPeriodEnd) {
      const endDate = new Date(billingPeriodEnd);
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const response = {
      tenant_id: validatedTenantId,
      subscription: {
        plan_code: planCode,
        status: subscriptionStatus,
        included_minutes: includedMinutes,
        included_sms_segments: includedSmsSegments,
        overage_minute_rate_cents: overageMinuteRateCents,
        overage_sms_rate_cents: overageSmsRateCents,
        credit_balance_cents: creditBalanceCents,
      },
      billing_period: {
        start: billingPeriodStart,
        end: billingPeriodEnd,
        days_remaining: daysRemaining,
      },
      usage: {
        voice: {
          used: voiceMinutesUsed,
          included: includedMinutes,
          percent_used: voicePercentUsed,
          overage_units: voiceOverageMinutes,
          overage_charge_cents: voiceOverageChargeCents,
        },
        sms: {
          used: smsSegmentsUsed,
          included: includedSmsSegments,
          percent_used: smsPercentUsed,
          overage_units: smsOverageSegments,
          overage_charge_cents: smsOverageChargeCents,
        },
      },
      charges: {
        total_overage_cents: totalOverageChargeCents,
        credit_applied_cents: creditAppliedCents,
        net_charge_cents: netOverageChargeCents,
      },
      alerts: {
        voice_at_80_percent: voicePercentUsed >= 80 && voicePercentUsed < 100,
        voice_at_100_percent: voicePercentUsed >= 100,
        sms_at_80_percent: smsPercentUsed >= 80 && smsPercentUsed < 100,
        sms_at_100_percent: smsPercentUsed >= 100,
      },
    };

    return jsonResponse(response);
  } catch (error: unknown) {
    console.error("[get-usage-status] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    const status = message.includes("Forbidden") || message.includes("Missing Authorization")
      ? 403
      : message.includes("not found")
      ? 404
      : 500;

    return errorResponse(message, status);
  }
});
