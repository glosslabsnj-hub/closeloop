import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";

export interface TestResult {
  id: string;
  category: "provisioning" | "telephony" | "webhook" | "extraction" | "entity" | "calendar" | "automation";
  label: string;
  description: string;
  passed: boolean;
  details?: string;
  value?: string | number | null;
  fixSuggestion?: string;
  fixLink?: string;
}

export interface GoldenPathRun {
  id: string;
  tenant_id: string;
  started_at: string;
  finished_at: string | null;
  overall_status: "running" | "passed" | "partial" | "failed";
  results_json: TestResult[];
  pass_count: number;
  fail_count: number;
  mode: string | null;
}

export function useGoldenPathRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<GoldenPathRun | null>(null);

  const runTests = useCallback(async (tenantId: string): Promise<GoldenPathRun | null> => {
    if (!tenantId) return null;
    
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Get tenant info
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name, business_mode, hipaa_mode")
        .eq("id", tenantId)
        .single();

      if (!tenant) {
        toast.error("Tenant not found");
        setIsRunning(false);
        return null;
      }

      const mode = tenant.business_mode as BusinessMode;

      // Create initial run record
      const { data: run, error: insertError } = await supabase
        .from("golden_path_runs")
        .insert({
          tenant_id: tenantId,
          mode: mode,
          overall_status: "running",
          results_json: [],
        })
        .select()
        .single();

      if (insertError || !run) {
        console.error("Failed to create run:", insertError);
        toast.error("Failed to start test run");
        setIsRunning(false);
        return null;
      }

      // ============================================
      // TEST 1: Voice Provisioning
      // ============================================
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_code, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const planCode = subscription?.plan_code || "";
      const hasVoice = planCode.startsWith("voice") || planCode.startsWith("both");
      const isActive = subscription?.status === "active" || subscription?.status === "trialing";

      results.push({
        id: "subscription_active",
        category: "provisioning",
        label: "Active subscription with voice SKU",
        description: "Plan code includes voice/both and status is active",
        passed: hasVoice && isActive,
        value: subscription?.plan_code || null,
        details: subscription ? `${subscription.plan_code} (${subscription.status})` : "No subscription",
        fixSuggestion: !subscription 
          ? "Add a subscription for this tenant" 
          : !hasVoice 
            ? "Upgrade to voice or both plan" 
            : !isActive 
              ? "Activate subscription" 
              : undefined,
        fixLink: "/app/settings",
      });

      const { data: phoneNumbers } = await supabase
        .from("phone_numbers")
        .select("phone_e164, status")
        .eq("tenant_id", tenantId);

      const hasPhoneNumber = (phoneNumbers?.length || 0) > 0;
      
      results.push({
        id: "phone_provisioned",
        category: "provisioning",
        label: "Twilio number provisioned",
        description: "phone_numbers row exists with valid E.164",
        passed: hasPhoneNumber,
        value: phoneNumbers?.[0]?.phone_e164 || null,
        details: phoneNumbers?.[0]?.phone_e164 || "No number provisioned",
        fixSuggestion: !hasPhoneNumber ? "Provision a Twilio number via subscription activation" : undefined,
        fixLink: "/app/go-live",
      });

      const { data: settings } = await supabase
        .from("assistant_settings")
        .select("closeloop_number, phone_connected")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const hasCloseloopNumber = !!settings?.closeloop_number;
      
      results.push({
        id: "assistant_settings_linked",
        category: "provisioning",
        label: "assistant_settings.closeloop_number set",
        description: "AI knows which number to use",
        passed: hasCloseloopNumber,
        value: settings?.closeloop_number || null,
        details: settings?.closeloop_number || "Not set",
        fixSuggestion: !hasCloseloopNumber ? "Complete phone provisioning" : undefined,
        fixLink: "/app/go-live",
      });

      // ============================================
      // TEST 2: Inbound Call Processing
      // ============================================
      const { data: twilioLogs } = await supabase
        .from("twilio_event_logs")
        .select("stage, error_message, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      const twilioStages = new Set(twilioLogs?.map(l => l.stage) || []);
      const hasInbound = twilioStages.has("call_received") || twilioStages.has("inbound_started");
      const hasContextBuilt = twilioStages.has("context_built");
      const hasElevenLabsSuccess = twilioStages.has("elevenlabs_success");
      const twilioErrors = twilioLogs?.filter(l => l.error_message);

      results.push({
        id: "inbound_received",
        category: "telephony",
        label: "Inbound call received by twilio-inbound",
        description: "Tenant resolved from To number",
        passed: hasInbound,
        details: hasInbound ? `${twilioLogs?.length || 0} events logged` : "No inbound calls logged",
        fixSuggestion: !hasInbound ? "Make a test call to the CloseLoop number" : undefined,
        fixLink: "/debug/telephony",
      });

      results.push({
        id: "context_built",
        category: "telephony",
        label: "Business context built successfully",
        description: "buildBusinessContext ran without errors",
        passed: hasContextBuilt,
        details: hasContextBuilt ? "Context assembled" : twilioErrors?.[0]?.error_message || "Not reached",
        fixSuggestion: !hasContextBuilt ? "Check debug page for context build errors" : undefined,
        fixLink: "/debug/ai-context",
      });

      results.push({
        id: "elevenlabs_registered",
        category: "telephony",
        label: "ElevenLabs call registered",
        description: "register-call returned conversation_id",
        passed: hasElevenLabsSuccess,
        details: hasElevenLabsSuccess ? "ElevenLabs handoff successful" : "Registration failed",
        fixSuggestion: !hasElevenLabsSuccess ? "Check ELEVENLABS_API_KEY secret" : undefined,
        fixLink: "/debug/telephony",
      });

      // Check ai_call_sessions created
      const { data: callSessions } = await supabase
        .from("ai_call_sessions")
        .select("id, outcome, summary, transcript, extracted_payload, twilio_call_sid, elevenlabs_conversation_id")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(10);

      const hasCallSession = (callSessions?.length || 0) > 0;
      
      results.push({
        id: "call_session_created",
        category: "telephony",
        label: "ai_call_sessions record created",
        description: "Call tracking row exists",
        passed: hasCallSession,
        details: hasCallSession ? `${callSessions?.length} sessions` : "No sessions",
        fixSuggestion: !hasCallSession ? "Complete a test call end-to-end" : undefined,
        fixLink: "/app/calls",
      });

      // ============================================
      // TEST 3: Post-call Webhook
      // ============================================
      const { data: aiEventLogs } = await supabase
        .from("ai_event_logs")
        .select("stage, error_message, event_data")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      const aiStages = new Set(aiEventLogs?.map(l => l.stage) || []);
      const webhookReceived = aiStages.has("webhook_received");
      const summarySaved = aiStages.has("summary_saved") || aiStages.has("transcript_saved");

      results.push({
        id: "webhook_received",
        category: "webhook",
        label: "elevenlabs-webhook received post_call_transcription",
        description: "HMAC verified, payload parsed",
        passed: webhookReceived,
        details: webhookReceived ? "Webhook processed" : "No webhook events",
        fixSuggestion: !webhookReceived ? "Check ElevenLabs agent webhook configuration" : undefined,
        fixLink: "/debug/telephony",
      });

      // Check for transcript/summary
      const hasTranscript = callSessions?.some(s => s.transcript);
      const hasSummary = callSessions?.some(s => s.summary);
      
      results.push({
        id: "transcript_summary_saved",
        category: "webhook",
        label: "Transcript + summary persisted",
        description: "ai_call_sessions has transcript and summary",
        passed: hasTranscript && hasSummary,
        details: `Transcript: ${hasTranscript ? "✓" : "✗"}, Summary: ${hasSummary ? "✓" : "✗"}`,
        fixSuggestion: !hasTranscript || !hasSummary ? "Webhook may have failed to parse response" : undefined,
        fixLink: "/app/calls",
      });

      // ============================================
      // TEST 4: Extraction + Normalization
      // ============================================
      const hasExtraction = callSessions?.some(s => s.extracted_payload);
      const extractedPayloads = callSessions?.filter(s => s.extracted_payload).map(s => s.extracted_payload) || [];
      
      results.push({
        id: "extraction_created",
        category: "extraction",
        label: "extracted_payload populated",
        description: "Structured data parsed from transcript",
        passed: hasExtraction,
        details: hasExtraction ? `${extractedPayloads.length} extractions found` : "No extractions",
        fixSuggestion: !hasExtraction ? "Extraction parser may need debugging" : undefined,
        fixLink: "/debug/extraction",
      });

      // Check for intent detection
      const hasOutcome = callSessions?.some(s => s.outcome);
      const outcomes = [...new Set(callSessions?.map(s => s.outcome).filter(Boolean))];
      
      results.push({
        id: "intent_detected",
        category: "extraction",
        label: "Intent/outcome determined",
        description: "Call classified (order, booked, dispatch, etc.)",
        passed: hasOutcome,
        details: hasOutcome ? `Outcomes: ${outcomes.join(", ")}` : "No outcomes detected",
        fixSuggestion: !hasOutcome ? "Check extraction pipeline" : undefined,
        fixLink: "/debug/extraction",
      });

      const customerResolved = aiStages.has("customer_resolved");
      
      results.push({
        id: "customer_resolved",
        category: "extraction",
        label: "Customer resolved/created",
        description: "Caller linked to customers table by phone_e164",
        passed: customerResolved,
        details: customerResolved ? "Customer linked" : "No customer linkage",
        fixSuggestion: !customerResolved ? "Check customer resolver in webhook" : undefined,
        fixLink: "/app/leads",
      });

      // ============================================
      // TEST 5: Deterministic Entity Routing (MODE-AWARE)
      // ============================================
      const entityChecks: { table: string; label: string; modes: BusinessMode[] }[] = [
        { table: "bookings", label: "bookings", modes: ["service", "general"] },
        { table: "food_orders", label: "food_orders", modes: ["food"] },
        { table: "reservations", label: "reservations", modes: ["food"] },
        { table: "dispatch_jobs", label: "dispatch_jobs", modes: ["dispatch"] },
        { table: "medical_intakes", label: "medical_intakes", modes: ["medical"] },
      ];

      for (const check of entityChecks) {
        if (!check.modes.includes(mode)) continue;

        let hasLinkedEntity = false;
        let entityCount = 0;

        if (check.table === "bookings") {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .not("session_id", "is", null);
          hasLinkedEntity = (count || 0) > 0;
          entityCount = count || 0;
        } else if (check.table === "food_orders") {
          const { count } = await supabase
            .from("food_orders")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .not("session_id", "is", null);
          hasLinkedEntity = (count || 0) > 0;
          entityCount = count || 0;
        } else if (check.table === "reservations") {
          const { count } = await supabase
            .from("reservations")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .not("session_id", "is", null);
          hasLinkedEntity = (count || 0) > 0;
          entityCount = count || 0;
        } else if (check.table === "dispatch_jobs") {
          const { count } = await supabase
            .from("dispatch_jobs")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .not("session_id", "is", null);
          hasLinkedEntity = (count || 0) > 0;
          entityCount = count || 0;
        } else if (check.table === "medical_intakes") {
          const { count } = await supabase
            .from("medical_intakes")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .not("session_id", "is", null);
          hasLinkedEntity = (count || 0) > 0;
          entityCount = count || 0;
        }

        results.push({
          id: `entity_${check.table}`,
          category: "entity",
          label: `${check.label} created from call`,
          description: `${mode} mode routes to ${check.table}`,
          passed: hasLinkedEntity,
          value: entityCount,
          details: hasLinkedEntity ? `${entityCount} linked records` : `No ${check.table} linked to sessions`,
          fixSuggestion: !hasLinkedEntity ? `Complete a call that results in a ${check.label.replace("_", " ")}` : undefined,
          fixLink: check.table === "bookings" ? "/app/bookings" 
            : check.table === "food_orders" ? "/app/orders"
            : check.table === "reservations" ? "/app/reservations"
            : check.table === "dispatch_jobs" ? "/app/dispatch"
            : "/app/medical-intake",
        });
      }

      // ============================================
      // TEST 6: Automation Runner
      // ============================================
      const { data: enabledRules } = await supabase
        .from("automation_rules")
        .select("id, enabled, trigger_event, action_type")
        .eq("tenant_id", tenantId)
        .eq("enabled", true);

      const hasEnabledRules = (enabledRules?.length || 0) > 0;
      
      results.push({
        id: "automation_rules_enabled",
        category: "automation",
        label: "Automation rules enabled",
        description: "At least one rule is active",
        passed: hasEnabledRules,
        details: hasEnabledRules ? `${enabledRules?.length} active rules` : "No enabled rules",
        fixSuggestion: !hasEnabledRules ? "Enable automations in Integrations page" : undefined,
        fixLink: "/app/integrations",
      });

      const { data: automationRuns } = await supabase
        .from("automation_runs")
        .select("id, status, trigger_event, error_message")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);

      const hasRuns = (automationRuns?.length || 0) > 0;
      const successfulRuns = automationRuns?.filter(r => r.status === "success") || [];
      const failedRuns = automationRuns?.filter(r => r.status === "failed") || [];

      results.push({
        id: "automation_runs_executed",
        category: "automation",
        label: "automation_runs executed",
        description: "Trigger events created run records",
        passed: hasRuns && successfulRuns.length > 0,
        details: hasRuns 
          ? `${successfulRuns.length} succeeded, ${failedRuns.length} failed` 
          : "No runs logged",
        fixSuggestion: !hasRuns 
          ? "Trigger an event that matches an enabled rule" 
          : failedRuns.length > 0 
            ? "Check failed run logs for errors" 
            : undefined,
        fixLink: "/app/integrations",
      });

      // ============================================
      // TEST 7: Calendar Busy Blocks
      // ============================================
      const { data: calendarConnections } = await supabase
        .from("calendar_connections")
        .select("id, provider, status")
        .eq("tenant_id", tenantId);

      const hasCalendarConnection = calendarConnections?.some(c => c.status === "connected");
      
      results.push({
        id: "calendar_connected",
        category: "calendar",
        label: "Calendar connection established",
        description: "External calendar linked for availability",
        passed: !!hasCalendarConnection,
        details: hasCalendarConnection 
          ? `Connected: ${calendarConnections?.filter(c => c.status === "connected").map(c => c.provider).join(", ")}` 
          : "No calendar connected",
        fixSuggestion: !hasCalendarConnection ? "Connect Google Calendar or other provider" : undefined,
        fixLink: "/app/integrations/schedule",
      });

      const { data: busyBlocks } = await supabase
        .from("busy_blocks")
        .select("id, block_type, start_at, end_at")
        .eq("tenant_id", tenantId)
        .eq("block_type", "external_busy")
        .order("created_at", { ascending: false })
        .limit(10);

      const hasExternalBlocks = (busyBlocks?.length || 0) > 0;

      results.push({
        id: "external_busy_synced",
        category: "calendar",
        label: "external_busy blocks inserted",
        description: "Calendar events sync to busy_blocks table",
        passed: hasExternalBlocks || !hasCalendarConnection, // Pass if no calendar to sync
        details: hasExternalBlocks 
          ? `${busyBlocks?.length} external blocks` 
          : hasCalendarConnection 
            ? "No blocks synced yet" 
            : "N/A (no calendar)",
        fixSuggestion: hasCalendarConnection && !hasExternalBlocks ? "Run calendar sync or add events to source calendar" : undefined,
        fixLink: "/debug/availability",
      });

      // Check AI context includes scheduling
      const { data: contextSnapshots } = await supabase
        .from("ai_context_snapshots")
        .select("context_json")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestContext = contextSnapshots?.[0]?.context_json as Record<string, unknown> | undefined;
      const hasSchedulingContext = !!(latestContext?.scheduling);

      results.push({
        id: "ai_avoids_busy",
        category: "calendar",
        label: "AI receives availability context",
        description: "Context snapshots include scheduling data",
        passed: hasSchedulingContext,
        details: hasSchedulingContext ? "Scheduling context present" : "No scheduling in context",
        fixSuggestion: !hasSchedulingContext ? "Make a test call to generate context snapshot" : undefined,
        fixLink: "/debug/ai-context",
      });

      // ============================================
      // CALCULATE FINAL STATUS
      // ============================================
      const passCount = results.filter(r => r.passed).length;
      const failCount = results.filter(r => !r.passed).length;
      const overallStatus: "passed" | "partial" | "failed" = 
        failCount === 0 ? "passed" : passCount > 0 ? "partial" : "failed";

      // Update run with results
      const { error: updateError } = await supabase
        .from("golden_path_runs")
        .update({
          finished_at: new Date().toISOString(),
          overall_status: overallStatus,
          results_json: JSON.parse(JSON.stringify(results)),
          pass_count: passCount,
          fail_count: failCount,
        })
        .eq("id", run.id);

      if (updateError) {
        console.error("Failed to update run:", updateError);
      }

      const finalRun: GoldenPathRun = {
        id: run.id,
        tenant_id: tenantId,
        started_at: run.started_at,
        finished_at: new Date().toISOString(),
        overall_status: overallStatus,
        results_json: results,
        pass_count: passCount,
        fail_count: failCount,
        mode: mode,
      };

      setCurrentRun(finalRun);
      setIsRunning(false);

      if (overallStatus === "passed") {
        toast.success(`All ${passCount} tests passed!`);
      } else if (overallStatus === "partial") {
        toast.warning(`${passCount} passed, ${failCount} failed`);
      } else {
        toast.error(`${failCount} tests failed`);
      }

      return finalRun;
    } catch (error) {
      console.error("Golden path test error:", error);
      toast.error("Test run failed unexpectedly");
      setIsRunning(false);
      return null;
    }
  }, []);

  return {
    runTests,
    isRunning,
    currentRun,
  };
}
