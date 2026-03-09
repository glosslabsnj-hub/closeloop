/**
 * tenant-health-check: Comprehensive health report for a tenant.
 *
 * Checks config completeness, integration status, notification delivery,
 * AI performance, and data health. Returns actionable issues.
 *
 * Mode-aware: dispatch tenants aren't flagged for missing calendar,
 * solo operators aren't flagged for missing staff, etc.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  area: "config" | "integration" | "notification" | "ai" | "data";
  message: string;
  action?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { tenant_id } = await req.json();

    if (!tenant_id) return errorResponse("Missing tenant_id");

    const issues: HealthIssue[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ===== FETCH TENANT =====
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, business_mode, industry, review_link, website, phone, created_at")
      .eq("id", tenant_id)
      .single();

    if (!tenant) return errorResponse("Tenant not found", 404);

    const mode = tenant.business_mode || "service";

    // ===== CONFIG HEALTH =====
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("settings_json, voice_ai_enabled, instant_text_enabled")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const configHealth: Record<string, any> = {
      business_name: !!tenant.name,
      phone_configured: !!tenant.phone,
      ai_enabled: settings?.voice_ai_enabled ?? false,
      text_back_enabled: settings?.instant_text_enabled ?? false,
      review_link_set: !!tenant.review_link,
    };

    if (!tenant.name) issues.push({ severity: "critical", area: "config", message: "Business name not set", action: "Go to Settings > Business Info" });
    if (!settings?.voice_ai_enabled) issues.push({ severity: "warning", area: "config", message: "AI voice is disabled", action: "Enable in Settings > AI Voice" });
    if (!tenant.review_link) issues.push({ severity: "warning", area: "config", message: "No Google review link set — review requests won't include a link", action: "Add in Settings > Business Info" });

    // ===== SERVICES / MENU =====
    const { count: servicesCount } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    const { data: servicesData } = await supabase
      .from("services")
      .select("id, name, price_amount, duration_minutes")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    const servicesWithPrice = (servicesData || []).filter(s => s.price_amount != null).length;
    const servicesWithDuration = (servicesData || []).filter(s => s.duration_minutes != null).length;
    const totalServices = servicesCount || 0;

    if (mode !== "food" && totalServices === 0) {
      issues.push({ severity: "critical", area: "data", message: "No services configured — AI can't book appointments", action: "Add services in Settings > Services" });
    }
    if (mode !== "food" && totalServices > 0 && servicesWithPrice === 0) {
      issues.push({ severity: "warning", area: "data", message: "No services have pricing — AI can't quote prices to callers", action: "Add pricing in Settings > Services" });
    }

    // ===== FAQS =====
    const { count: faqsCount } = await supabase
      .from("faqs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id);

    if ((faqsCount || 0) < 3) {
      issues.push({ severity: "warning", area: "data", message: `Only ${faqsCount || 0} FAQs — AI won't be able to answer common questions`, action: "Add FAQs in Settings > Knowledge Base" });
    }

    // ===== INTEGRATION HEALTH =====
    const { data: integrations } = await supabase
      .from("integration_oauth_tokens")
      .select("id, provider, status, expires_at, error_message, updated_at")
      .eq("tenant_id", tenant_id);

    const integrationHealth: Record<string, any> = {};
    for (const integ of integrations || []) {
      const daysUntilExpiry = integ.expires_at
        ? (new Date(integ.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        : null;

      integrationHealth[integ.provider] = {
        status: integ.status,
        token_valid: integ.status === "connected",
        token_expires_in_days: daysUntilExpiry ? Math.round(daysUntilExpiry) : null,
        error_message: integ.error_message,
      };

      if (integ.status === "error" || integ.status === "token_expired") {
        issues.push({
          severity: "critical",
          area: "integration",
          message: `${integ.provider} connection is broken: ${integ.error_message || "needs reconnection"}`,
          action: "Reconnect in Settings > Integrations",
        });
      } else if (daysUntilExpiry != null && daysUntilExpiry < 7) {
        issues.push({
          severity: "warning",
          area: "integration",
          message: `${integ.provider} token expires in ${Math.round(daysUntilExpiry)} days`,
          action: "Token should auto-refresh. If it fails, reconnect in Settings > Integrations",
        });
      }
    }

    // ===== NOTIFICATION HEALTH =====
    // Check SMS delivery rate (last 30 days)
    const { count: smsSent } = await supabase
      .from("sms_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .gte("created_at", thirtyDaysAgo);

    const { count: smsDelivered } = await supabase
      .from("sms_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .eq("status", "delivered")
      .gte("created_at", thirtyDaysAgo);

    const smsDeliveryRate = (smsSent && smsSent > 0)
      ? ((smsDelivered || 0) / smsSent)
      : null;

    const notificationHealth = {
      sms_sent_30d: smsSent || 0,
      sms_delivered_30d: smsDelivered || 0,
      sms_delivery_rate: smsDeliveryRate,
    };

    if (smsDeliveryRate != null && smsDeliveryRate < 0.8) {
      issues.push({
        severity: "warning",
        area: "notification",
        message: `SMS delivery rate is ${Math.round(smsDeliveryRate * 100)}% (last 30 days)`,
        action: "Check phone numbers and carrier settings",
      });
    }

    // ===== AI HEALTH =====
    const { count: totalCalls } = await supabase
      .from("call_records")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .gte("created_at", thirtyDaysAgo);

    const { count: bookingsByAi } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .eq("booking_source", "phone_ai")
      .gte("created_at", thirtyDaysAgo);

    const aiHealth = {
      ai_enabled: settings?.voice_ai_enabled ?? false,
      total_calls_30d: totalCalls || 0,
      bookings_created_by_ai_30d: bookingsByAi || 0,
    };

    // ===== DATA HEALTH =====
    const { count: leadsCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id);

    const { count: activeBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", now.toISOString());

    const dataHealth = {
      services_count: totalServices,
      services_with_pricing: servicesWithPrice,
      services_with_duration: servicesWithDuration,
      faqs_count: faqsCount || 0,
      leads_count: leadsCount || 0,
      active_bookings: activeBookings || 0,
    };

    // ===== AUTOMATION HEALTH =====
    const settingsJson = settings?.settings_json as Record<string, any> | null;
    const smsTemplates = settingsJson?.sms_templates || {};

    const automationHealth = {
      appointment_confirmation: smsTemplates.appointment_confirmation?.enabled ?? false,
      appointment_reminder: smsTemplates.appointment_reminder?.enabled ?? false,
      review_request: smsTemplates.review_request?.enabled ?? false,
    };

    if (!automationHealth.appointment_confirmation) {
      issues.push({ severity: "info", area: "notification", message: "Appointment confirmation SMS is disabled", action: "Enable in Settings > SMS Templates" });
    }
    if (!automationHealth.appointment_reminder) {
      issues.push({ severity: "info", area: "notification", message: "Appointment reminder SMS is disabled", action: "Enable in Settings > SMS Templates" });
    }

    // ===== CALCULATE OVERALL SCORE =====
    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;

    let score = 100;
    score -= criticalCount * 20;
    score -= warningCount * 5;
    score = Math.max(0, Math.min(100, score));

    const overallStatus = criticalCount > 0 ? "critical" : warningCount > 2 ? "degraded" : "healthy";

    // ===== CHECK IF NEW TENANT (needs_setup) =====
    const daysSinceCreation = (now.getTime() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const isNew = daysSinceCreation < 1 && totalServices === 0;

    const result = {
      tenant_id,
      business_mode: mode,
      config_health: configHealth,
      integration_health: integrationHealth,
      notification_health: notificationHealth,
      ai_health: aiHealth,
      data_health: dataHealth,
      automation_health: automationHealth,
      overall_score: score,
      overall_status: isNew ? "needs_setup" : overallStatus,
      issues,
      checked_at: now.toISOString(),
    };

    return jsonResponse(result);
  } catch (err) {
    console.error("[tenant-health-check] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
