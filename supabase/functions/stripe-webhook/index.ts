import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Determine if a plan SKU includes voice features (supports both legacy and new SKU codes)
function hasVoiceFeature(planCode: string | null): boolean {
  if (!planCode) return false;
  return planCode.startsWith("base") || planCode.startsWith("growth") ||
         planCode.startsWith("scale") || planCode.startsWith("power") ||
         planCode === "enterprise" ||
         planCode.startsWith("voice") || planCode.startsWith("both");
}

// Plan limits map — mirrors src/config/pricing.ts for edge function use
const PLAN_LIMITS: Record<string, { includedMinutes: number; overageRateCents: number | null }> = {
  "base-200":     { includedMinutes: 200,   overageRateCents: 55 },
  "growth-2000":  { includedMinutes: 2000,  overageRateCents: 45 },
  "scale-5000":   { includedMinutes: 5000,  overageRateCents: 35 },
  "power-10000":  { includedMinutes: 10000, overageRateCents: 29 },
  "enterprise":   { includedMinutes: 20000, overageRateCents: null }, // custom pricing
  // Legacy SKU mappings
  "voice-200":    { includedMinutes: 200,   overageRateCents: 55 },
  "voice-600":    { includedMinutes: 600,   overageRateCents: 45 },
  "voice-1500":   { includedMinutes: 1500,  overageRateCents: 35 },
};

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Parse Stripe signature header (format: t=timestamp,v1=signature,v1=signature2...)
function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<{ valid: boolean; error?: string }> {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return { valid: false, error: "Invalid signature header format" };
  }

  // Check timestamp is within tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  if (isNaN(webhookTimestamp) || Math.abs(now - webhookTimestamp) > toleranceSeconds) {
    return { valid: false, error: "Webhook timestamp outside tolerance window" };
  }

  // Compute expected signature: HMAC-SHA256(timestamp + "." + payload)
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Check if any of the provided signatures match (Stripe may send multiple)
  const isValid = signatures.some((sig) => secureCompare(sig, expectedSignature));

  if (!isValid) {
    return { valid: false, error: "Signature verification failed" };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Verify Stripe webhook signature when secret is configured
    if (STRIPE_WEBHOOK_SECRET) {
      if (!signature) {
        console.error("Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
      if (!verification.valid) {
        console.error("Stripe signature verification failed:", verification.error);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Stripe signature verified successfully");
    } else {
      console.warn("STRIPE_WEBHOOK_SECRET not set - signature verification skipped (not recommended for production)");
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse webhook body:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Received Stripe event: ${event.type}`);

    // Handle credit top-up separately (one-time payment, not subscription)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentType = session.metadata?.type;

      if (paymentType === "credit_top_up") {
        const tenantId = session.metadata?.tenant_id;
        const creditAmountCents = parseInt(session.metadata?.credit_amount_cents || "0", 10);

        if (tenantId && creditAmountCents > 0) {
          console.log(`CreditTopUp: tenant=${tenantId} amount=${creditAmountCents} cents`);

          // Atomically add credits to the tenant's subscription balance
          const { data: subscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("credit_balance_cents")
            .eq("tenant_id", tenantId)
            .single();

          if (fetchError) {
            console.error(`CreditTopUp: failed to fetch subscription for tenant ${tenantId}:`, fetchError);
          } else {
            const currentBalance = subscription?.credit_balance_cents || 0;
            const newBalance = currentBalance + creditAmountCents;

            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                credit_balance_cents: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq("tenant_id", tenantId);

            if (updateError) {
              console.error(`CreditTopUp: failed to update balance for tenant ${tenantId}:`, updateError);
            } else {
              console.log(`CreditTopUp: success tenant=${tenantId} oldBalance=${currentBalance} newBalance=${newBalance}`);

              // Log the transaction for audit purposes
              await supabase.from("audit_events").insert({
                tenant_id: tenantId,
                event_type: "payment_received",
                entity_type: "subscription",
                actor_type: "system",
                payload: {
                  type: "credit_top_up",
                  amount_cents: creditAmountCents,
                  old_balance_cents: currentBalance,
                  new_balance_cents: newBalance,
                  stripe_session_id: session.id,
                },
               });
            }
          }
        } else {
          console.error(`CreditTopUp: invalid metadata tenant_id=${tenantId} amount=${creditAmountCents}`);
        }

        // Return early - credit top-up doesn't need subscription/provisioning logic
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle invoice payment for agency commissions
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const tenantId = invoice.subscription_details?.metadata?.tenant_id
        || invoice.lines?.data?.[0]?.metadata?.tenant_id;
      const amountCents = invoice.amount_paid;
      const stripeInvoiceId = invoice.id;
      const periodStart = invoice.lines?.data?.[0]?.period?.start;
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;

      if (tenantId && amountCents > 0) {
        // Check if this tenant is managed by an agency
        const { data: agencyLink } = await supabase
          .from("agency_tenants")
          .select("agency_id")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .maybeSingle();

        if (agencyLink) {
          // Get agency commission rate
          const { data: agency } = await supabase
            .from("agency_accounts")
            .select("billing_config_json")
            .eq("id", agencyLink.agency_id)
            .single();

          const commissionRate = (agency?.billing_config_json as Record<string, unknown>)?.commission_rate as number || 0.20;
          const commissionCents = Math.round(amountCents * commissionRate);

          // Insert commission record (idempotent via UNIQUE constraint)
          const { error: commErr } = await supabase.from("agency_commissions").upsert({
            agency_id: agencyLink.agency_id,
            tenant_id: tenantId,
            stripe_invoice_id: stripeInvoiceId,
            invoice_amount_cents: amountCents,
            commission_rate: commissionRate,
            commission_cents: commissionCents,
            status: "pending",
            period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          }, { onConflict: "agency_id,stripe_invoice_id" });

          if (commErr) {
            console.error(`Commission insert error for agency ${agencyLink.agency_id}:`, commErr);
          } else {
            console.log(`Commission recorded: agency=${agencyLink.agency_id} tenant=${tenantId} amount=${commissionCents}c`);

            // Log commission creation to audit_events
            await supabase.from("audit_events").insert({
              tenant_id: tenantId,
              event_type: "commission_created",
              entity_type: "agency_commission",
              actor_type: "system",
              payload: {
                agency_id: agencyLink.agency_id,
                stripe_invoice_id: stripeInvoiceId,
                invoice_amount_cents: amountCents,
                commission_rate: commissionRate,
                commission_cents: commissionCents,
              },
            });
          }
        }
      }
    }

    // Handle invoice.created — add overage charges to draft invoices
    if (event.type === "invoice.created") {
      const invoice = event.data.object;

      // Only process subscription renewal invoices (not first invoice, manual, etc.)
      if (invoice.billing_reason !== "subscription_cycle") {
        console.log(`OverageBilling: skipping invoice ${invoice.id} reason=${invoice.billing_reason}`);
      } else {
        const stripeSubscriptionId = invoice.subscription;
        console.log(`OverageBilling: processing invoice ${invoice.id} for subscription ${stripeSubscriptionId}`);

        // Look up tenant by stripe_subscription_id
        const { data: sub, error: subError } = await supabase
          .from("subscriptions")
          .select("tenant_id, status, included_minutes, overage_minute_rate_cents, credit_balance_cents")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .maybeSingle();

        if (subError || !sub) {
          console.error(`OverageBilling: subscription lookup failed sub=${stripeSubscriptionId}`, subError);
        } else if (sub.status === "trialing") {
          console.log(`OverageBilling: skip tenant=${sub.tenant_id} reason=trialing`);
        } else if (!sub.overage_minute_rate_cents) {
          console.log(`OverageBilling: skip tenant=${sub.tenant_id} reason=no-overage-rate (enterprise or unset)`);
        } else {
          // Find the most recent unsettled usage record
          const { data: usageRecord, error: usageError } = await supabase
            .from("subscription_usage")
            .select("*")
            .eq("tenant_id", sub.tenant_id)
            .eq("overage_settled", false)
            .order("billing_period_start", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (usageError) {
            console.error(`OverageBilling: usage lookup failed tenant=${sub.tenant_id}`, usageError);
          } else if (!usageRecord) {
            console.log(`OverageBilling: no unsettled usage for tenant=${sub.tenant_id}`);
          } else {
            const usedMinutes = usageRecord.voice_minutes_used || 0;
            const includedMinutes = sub.included_minutes || 0;
            const overageMinutes = Math.max(0, usedMinutes - includedMinutes);
            const grossOverageCents = overageMinutes * sub.overage_minute_rate_cents;
            const creditBalance = sub.credit_balance_cents || 0;
            const creditApplied = Math.min(creditBalance, grossOverageCents);
            const netChargeCents = grossOverageCents - creditApplied;

            console.log(`OverageBilling: tenant=${sub.tenant_id} used=${usedMinutes} included=${includedMinutes} overage=${overageMinutes}min gross=${grossOverageCents}c credit=${creditApplied}c net=${netChargeCents}c`);

            // Add invoice item to the draft invoice if there's a net charge
            if (netChargeCents > 0) {
              const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
              if (!STRIPE_SECRET_KEY) {
                console.error("OverageBilling: STRIPE_SECRET_KEY not configured");
              } else {
                const description = `Voice overage: ${overageMinutes} min × $${(sub.overage_minute_rate_cents / 100).toFixed(2)}/min`
                  + (creditApplied > 0 ? ` (credit applied: -$${(creditApplied / 100).toFixed(2)})` : "");

                const itemResponse = await fetch("https://api.stripe.com/v1/invoiceitems", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    customer: invoice.customer,
                    invoice: invoice.id,
                    amount: netChargeCents.toString(),
                    currency: invoice.currency || "usd",
                    description,
                  }).toString(),
                });

                if (!itemResponse.ok) {
                  const errText = await itemResponse.text();
                  console.error(`OverageBilling: Stripe invoiceitem creation failed: ${errText}`);
                } else {
                  console.log(`OverageBilling: invoice item added to ${invoice.id} amount=${netChargeCents}c`);
                }
              }
            }

            // Mark usage record as settled (even if $0 overage)
            const { error: settleError } = await supabase
              .from("subscription_usage")
              .update({
                overage_settled: true,
                settled_invoice_id: invoice.id,
                overage_billed_cents: netChargeCents,
                credit_applied_cents: creditApplied,
                updated_at: new Date().toISOString(),
              })
              .eq("id", usageRecord.id);

            if (settleError) {
              console.error(`OverageBilling: failed to settle usage record ${usageRecord.id}`, settleError);
            }

            // Deduct applied credits from subscription balance
            if (creditApplied > 0) {
              const newCreditBalance = creditBalance - creditApplied;
              const { error: creditError } = await supabase
                .from("subscriptions")
                .update({
                  credit_balance_cents: newCreditBalance,
                  updated_at: new Date().toISOString(),
                })
                .eq("tenant_id", sub.tenant_id);

              if (creditError) {
                console.error(`OverageBilling: failed to deduct credits for tenant ${sub.tenant_id}`, creditError);
              }
            }

            // Log audit event
            await supabase.from("audit_events").insert({
              tenant_id: sub.tenant_id,
              event_type: "overage_billed",
              entity_type: "subscription",
              actor_type: "system",
              payload: {
                invoice_id: invoice.id,
                usage_record_id: usageRecord.id,
                used_minutes: usedMinutes,
                included_minutes: includedMinutes,
                overage_minutes: overageMinutes,
                gross_overage_cents: grossOverageCents,
                credit_applied_cents: creditApplied,
                net_billed_cents: netChargeCents,
                billing_period_start: usageRecord.billing_period_start,
                billing_period_end: usageRecord.billing_period_end,
              },
            });

            // Create next billing period's usage record aligned with Stripe billing cycle
            const nextPeriodStart = invoice.lines?.data?.[0]?.period?.start;
            const nextPeriodEnd = invoice.lines?.data?.[0]?.period?.end;
            if (nextPeriodStart && nextPeriodEnd) {
              const { error: nextError } = await supabase
                .from("subscription_usage")
                .upsert({
                  tenant_id: sub.tenant_id,
                  billing_period_start: new Date(nextPeriodStart * 1000).toISOString(),
                  billing_period_end: new Date(nextPeriodEnd * 1000).toISOString(),
                  voice_minutes_used: 0,
                  sms_segments_used: 0,
                }, { onConflict: "tenant_id,billing_period_start" });

              if (nextError) {
                console.error(`OverageBilling: failed to create next period for tenant ${sub.tenant_id}`, nextError);
              } else {
                console.log(`OverageBilling: next period created for tenant ${sub.tenant_id} ${new Date(nextPeriodStart * 1000).toISOString()} - ${new Date(nextPeriodEnd * 1000).toISOString()}`);
              }
            }
          }
        }
      }
    }

    // Handle subscription-related events
    if (event.type === "checkout.session.completed" ||
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "invoice.payment_succeeded") {

      let tenantId: string | null = null;
      let planCode: string | null = null;
      let subscriptionStatus: string | null = null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        tenantId = session.metadata?.tenant_id;
        planCode = session.metadata?.plan_code;

        // Get subscription status if this was a subscription checkout
        if (session.subscription) {
          subscriptionStatus = "active"; // checkout.session.completed means payment succeeded

          // Store Stripe IDs on subscription record
          if (tenantId) {
            const limits = planCode ? PLAN_LIMITS[planCode] : null;
            const upsertFields: Record<string, unknown> = {
              tenant_id: tenantId,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              plan_code: planCode || undefined,
              status: "trialing", // Will be trialing if trial_period_days was set
              trial_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (limits) {
              upsertFields.included_minutes = limits.includedMinutes;
              upsertFields.overage_minute_rate_cents = limits.overageRateCents;
            }
            await supabase
              .from("subscriptions")
              .upsert(upsertFields, { onConflict: "tenant_id" });
          }
        }
      } else if (event.type === "invoice.payment_succeeded") {
        // For invoice events, extract tenant from subscription metadata
        const invoice = event.data.object;
        tenantId = invoice.subscription_details?.metadata?.tenant_id
          || invoice.lines?.data?.[0]?.metadata?.tenant_id;
        planCode = invoice.subscription_details?.metadata?.plan_code
          || invoice.lines?.data?.[0]?.metadata?.plan_code;
        subscriptionStatus = "active";
      } else {
        // customer.subscription.* events
        const subscription = event.data.object;
        tenantId = subscription.metadata?.tenant_id;
        subscriptionStatus = subscription.status;
        
        // Extract plan_code from the subscription items if not in metadata
        if (!planCode && subscription.items?.data?.[0]?.price?.metadata?.plan_code) {
          planCode = subscription.items.data[0].price.metadata.plan_code;
        }
        planCode = planCode || subscription.metadata?.plan_code;
      }

      console.log(`Extracted: tenant_id=${tenantId}, plan_code=${planCode}, status=${subscriptionStatus}`);

      // Provision phone number if conditions are met (supports both legacy and SKU-based codes)
      const shouldProvision = hasVoiceFeature(planCode);
      console.log(`TwilioProvision: evaluating tenant=${tenantId}, plan=${planCode}, shouldProvision=${shouldProvision}`);

      if (tenantId && shouldProvision) {
        if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
          console.log(`TwilioProvision: start for tenant ${tenantId}`);
          
          // Call the provision function (already idempotent)
          const provisionResult = await provisionForwardingNumber(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId);
          
          if (provisionResult.success) {
            console.log(`TwilioProvision: success tenant=${tenantId} phone=${provisionResult.phone_number}`);
          } else {
            console.error(`TwilioProvision: error tenant=${tenantId} error=${provisionResult.error}`);
            // Log to twilio_event_logs for visibility
            try {
              await supabase.from("twilio_event_logs").insert({
                tenant_id: tenantId,
                event_type: "provision_failed",
                stage: "stripe_webhook",
                error_message: provisionResult.error,
              });
            } catch (e) {
              console.error("Failed to log provision error:", e);
            }
          }
        } else {
          console.log(`TwilioProvision: skipped tenant=${tenantId} reason=subscription-not-active status=${subscriptionStatus}`);
        }
      } else if (tenantId && !shouldProvision) {
        console.log(`TwilioProvision: skipped tenant=${tenantId} reason=no-voice-feature plan=${planCode}`);
      }
    }

    // Handle subscription status transitions (trial → active, past_due, etc.)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;
      const newStatus = subscription.status;

      if (tenantId && newStatus) {
        // Map Stripe status to our status
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "past_due",
        };

        const mappedStatus = statusMap[newStatus];
        if (mappedStatus) {
          console.log(`Subscription status update: tenant=${tenantId} status=${newStatus} -> ${mappedStatus}`);

          const updateFields: Record<string, unknown> = {
            status: mappedStatus,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          };

          // On trial start, record trial_started_at
          if (newStatus === "trialing" && subscription.trial_start) {
            updateFields.trial_started_at = new Date(subscription.trial_start * 1000).toISOString();
          }

          // On conversion from trial to active, update period end
          if (newStatus === "active" && subscription.current_period_end) {
            updateFields.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
          }

          // Update included_minutes and overage rate if plan changed
          const updatedPlanCode = subscription.metadata?.plan_code
            || subscription.items?.data?.[0]?.price?.metadata?.plan_code;
          if (updatedPlanCode) {
            const limits = PLAN_LIMITS[updatedPlanCode];
            if (limits) {
              updateFields.plan_code = updatedPlanCode;
              updateFields.included_minutes = limits.includedMinutes;
              updateFields.overage_minute_rate_cents = limits.overageRateCents;
            }
          }

          await supabase
            .from("subscriptions")
            .update(updateFields)
            .eq("tenant_id", tenantId);
        }
      }
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;
      
      if (tenantId) {
        console.log(`Subscription canceled for tenant ${tenantId}`);
        // Optionally update connect_status or mark number for release
        await supabase
          .from("assistant_settings")
          .update({ 
            connect_status: "subscription_canceled",
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenantId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Provision a forwarding number for a tenant
async function provisionForwardingNumber(
  supabaseUrl: string,
  serviceRoleKey: string,
  tenantId: string
): Promise<{ success: boolean; phone_number?: string; error?: string }> {
  
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Check if tenant already has a forwarding number (idempotency)
  const { data: existingNumbers, error: lookupError } = await supabase
    .from("phone_numbers")
    .select("phone_e164, twilio_sid")
    .eq("tenant_id", tenantId)
    .eq("purpose", "forwarding");

  if (lookupError) {
    return { success: false, error: `Database lookup failed: ${lookupError.message}` };
  }

  if (existingNumbers && existingNumbers.length > 0) {
    const existingNumber = existingNumbers[0];
    console.log(`Tenant ${tenantId} already has number: ${existingNumber.phone_e164}`);
    return { success: true, phone_number: existingNumber.phone_e164 };
  }

  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  // Search for available US local numbers
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?Limit=1&VoiceEnabled=true&SmsEnabled=true`;

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Basic ${twilioAuth}` },
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    return { success: false, error: `Twilio search failed: ${errorText}` };
  }

  const searchData = await searchResponse.json();

  if (!searchData.available_phone_numbers?.length) {
    return { success: false, error: "No phone numbers available" };
  }

  const selectedNumber = searchData.available_phone_numbers[0].phone_number;

  // Purchase the number with webhook configuration
  const voiceWebhookUrl = `${supabaseUrl}/functions/v1/twilio-inbound`;
  
  const purchaseBody = new URLSearchParams({
    PhoneNumber: selectedNumber,
    VoiceUrl: voiceWebhookUrl,
    VoiceMethod: "POST",
    FriendlyName: `CloseLoop-${tenantId.substring(0, 8)}`,
  });

  const purchaseResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseBody.toString(),
    }
  );

  if (!purchaseResponse.ok) {
    const errorText = await purchaseResponse.text();
    return { success: false, error: `Twilio purchase failed: ${errorText}` };
  }

  const purchaseData = await purchaseResponse.json();

  // Insert into phone_numbers table
  const { error: insertError } = await supabase
    .from("phone_numbers")
    .insert({
      tenant_id: tenantId,
      phone_e164: purchaseData.phone_number,
      twilio_sid: purchaseData.sid,
      purpose: "forwarding",
      status: "provisioned",
    });

  if (insertError) {
    console.error("Failed to insert phone number record:", insertError);
    // Number is purchased but DB insert failed - log for manual cleanup
    return { 
      success: false, 
      error: `Number purchased (${purchaseData.phone_number}) but DB insert failed: ${insertError.message}` 
    };
  }

  // Update assistant_settings with awaiting_first_call status
  const { error: upsertError } = await supabase
    .from("assistant_settings")
    .upsert({
      tenant_id: tenantId,
      forwarding_phone_e164: purchaseData.phone_number,
      connect_status: "awaiting_first_call",
      phone_connected: true,
      closeloop_number: purchaseData.phone_number,
      twilio_phone_sid: purchaseData.sid,
      twilio_provisioned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "tenant_id",
    });

  if (upsertError) {
    console.error("Failed to update assistant_settings:", upsertError);
  }

  return { success: true, phone_number: purchaseData.phone_number };
}
