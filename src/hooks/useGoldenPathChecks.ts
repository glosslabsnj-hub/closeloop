import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Automated Golden Path checks - verifies end-to-end functionality
 */

export interface AutoCheck {
  id: string;
  label: string;
  description: string;
  category: "provisioning" | "telephony" | "webhook" | "extraction" | "entity" | "calendar" | "automation";
  passed: boolean;
  details?: string;
  value?: string | number | null;
}

export interface GoldenPathCheckResult {
  checks: AutoCheck[];
  loading: boolean;
  refetch: () => void;
}

export function useGoldenPathChecks(tenantId: string | null): GoldenPathCheckResult {
  const query = useQuery({
    queryKey: ["golden-path-checks", tenantId],
    queryFn: async (): Promise<AutoCheck[]> => {
      if (!tenantId) return [];
      
      const checks: AutoCheck[] = [];

      // 1. Subscription -> hasVoiceFeature -> Twilio provisioning -> phone_numbers row
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_code, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const planCode = subscription?.plan_code || "";
      const hasVoice = planCode.startsWith("voice") || planCode.startsWith("both");
      
      checks.push({
        id: "subscription_sku",
        label: "Subscription SKU set",
        description: "Active subscription with valid plan code",
        category: "provisioning",
        passed: !!subscription && (subscription.status === "active" || subscription.status === "trialing"),
        value: subscription?.plan_code || null,
        details: subscription ? `${subscription.plan_code} (${subscription.status})` : "No subscription",
      });

      const { data: phoneNumbers } = await supabase
        .from("phone_numbers")
        .select("phone_e164, status")
        .eq("tenant_id", tenantId);

      checks.push({
        id: "has_voice_feature",
        label: "Voice feature enabled",
        description: "Plan code includes voice capability",
        category: "provisioning",
        passed: hasVoice,
        details: hasVoice ? `Plan ${planCode} includes voice` : "SMS-only plan",
      });

      checks.push({
        id: "phone_provisioned",
        label: "Twilio number provisioned",
        description: "Phone number exists in phone_numbers table",
        category: "provisioning",
        passed: (phoneNumbers?.length || 0) > 0,
        value: phoneNumbers?.[0]?.phone_e164 || null,
        details: phoneNumbers?.[0]?.phone_e164 || "No number provisioned",
      });

      // 2. Inbound call -> twilio_event_logs stages present
      const { data: twilioLogs } = await supabase
        .from("twilio_event_logs")
        .select("stage, error_message")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);

      const twilioStages = new Set(twilioLogs?.map(l => l.stage) || []);
      const hasInbound = twilioStages.has("call_received") || twilioStages.has("inbound_started");
      const hasContextBuilt = twilioStages.has("context_built");
      const hasElevenLabsSuccess = twilioStages.has("elevenlabs_success");

      checks.push({
        id: "twilio_inbound_received",
        label: "Inbound call received",
        description: "twilio_event_logs has call_received stage",
        category: "telephony",
        passed: hasInbound,
        details: hasInbound ? `${twilioLogs?.length || 0} events logged` : "No inbound calls logged",
      });

      checks.push({
        id: "context_built",
        label: "Context built for call",
        description: "Business context was assembled for voice AI",
        category: "telephony",
        passed: hasContextBuilt,
      });

      checks.push({
        id: "elevenlabs_handoff",
        label: "ElevenLabs handoff successful",
        description: "Call was successfully routed to ElevenLabs",
        category: "telephony",
        passed: hasElevenLabsSuccess,
      });

      // 3. elevenlabs-webhook receives post_call_transcription
      const { data: aiEventLogs } = await supabase
        .from("ai_event_logs")
        .select("stage, error_message")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(30);

      const aiStages = new Set(aiEventLogs?.map(l => l.stage) || []);
      const webhookReceived = aiStages.has("webhook_received");
      const summarySaved = aiStages.has("summary_saved");
      const extractionSaved = aiStages.has("extraction_saved");
      const customerResolved = aiStages.has("customer_resolved");

      checks.push({
        id: "webhook_received",
        label: "ElevenLabs webhook received",
        description: "post_call_transcription event received",
        category: "webhook",
        passed: webhookReceived,
        details: webhookReceived ? "Webhook processed" : "No webhook events",
      });

      checks.push({
        id: "summary_transcript_saved",
        label: "Summary + transcript saved",
        description: "Call summary persisted to ai_call_sessions",
        category: "webhook",
        passed: summarySaved,
      });

      // 4. extracted_payload created
      const { data: callSessions } = await supabase
        .from("ai_call_sessions")
        .select("id, extracted_payload, summary, outcome")
        .eq("tenant_id", tenantId)
        .not("extracted_payload", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      const hasExtraction = (callSessions?.length || 0) > 0;
      const latestExtraction = callSessions?.[0]?.extracted_payload;

      checks.push({
        id: "extraction_created",
        label: "Extracted payload created",
        description: "Structured data extracted from transcript",
        category: "extraction",
        passed: hasExtraction,
        details: hasExtraction 
          ? `${callSessions?.length} sessions with extraction` 
          : "No extractions found",
      });

      checks.push({
        id: "customer_resolved",
        label: "Customer resolved/created",
        description: "Caller linked to customers table",
        category: "extraction",
        passed: customerResolved,
      });

      // 5. Derived entity persisted into correct module table
      const { data: tenant } = await supabase
        .from("tenants")
        .select("business_mode")
        .eq("id", tenantId)
        .single();

      const mode = tenant?.business_mode || "service";
      let entityTable = "bookings";
      if (mode === "food") entityTable = "food_orders";
      else if (mode === "dispatch") entityTable = "dispatch_jobs";
      else if (mode === "medical") entityTable = "medical_intakes";

      // Check if any entities have session_id linkage
      let hasLinkedEntity = false;
      if (entityTable === "bookings") {
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .not("session_id", "is", null);
        hasLinkedEntity = (count || 0) > 0;
      } else if (entityTable === "food_orders") {
        const { count } = await supabase
          .from("food_orders")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .not("session_id", "is", null);
        hasLinkedEntity = (count || 0) > 0;
      } else if (entityTable === "dispatch_jobs") {
        const { count } = await supabase
          .from("dispatch_jobs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .not("session_id", "is", null);
        hasLinkedEntity = (count || 0) > 0;
      }

      checks.push({
        id: "entity_persisted",
        label: `Derived entity persisted (${entityTable})`,
        description: `Call outcome routed to correct table for ${mode} mode`,
        category: "entity",
        passed: hasLinkedEntity,
        details: hasLinkedEntity ? `Found linked ${entityTable}` : `No ${entityTable} linked to sessions`,
      });

      // 6. Calendar sync creates external_busy busy_blocks
      const { data: busyBlocks } = await supabase
        .from("busy_blocks")
        .select("id, block_type")
        .eq("tenant_id", tenantId)
        .eq("block_type", "external_busy")
        .limit(5);

      const hasExternalBlocks = (busyBlocks?.length || 0) > 0;

      checks.push({
        id: "calendar_sync_blocks",
        label: "Calendar sync creates busy_blocks",
        description: "External calendar events synced as external_busy",
        category: "calendar",
        passed: hasExternalBlocks,
        details: hasExternalBlocks 
          ? `${busyBlocks?.length} external blocks found` 
          : "No external_busy blocks",
      });

      // Check if AI respects busy blocks (context snapshot has availability data)
      const { data: contextSnapshots } = await supabase
        .from("ai_context_snapshots")
        .select("context_json")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestContext = contextSnapshots?.[0]?.context_json as Record<string, unknown> | undefined;
      const hasSchedulingContext = !!(latestContext?.scheduling);

      checks.push({
        id: "ai_respects_availability",
        label: "AI receives scheduling context",
        description: "Context snapshots include scheduling/availability data",
        category: "calendar",
        passed: hasSchedulingContext,
      });

      // 7. Automations preset test sends payload and logs run steps
      const { data: automationRuns } = await supabase
        .from("automation_runs")
        .select("id, status, trigger_event")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);

      const hasRuns = (automationRuns?.length || 0) > 0;
      const successfulRuns = automationRuns?.filter(r => r.status === "success") || [];

      checks.push({
        id: "automation_executed",
        label: "Automation runs executed",
        description: "Trigger events fire automation_runs",
        category: "automation",
        passed: hasRuns,
        details: hasRuns ? `${automationRuns?.length} runs, ${successfulRuns.length} successful` : "No runs logged",
      });

      const { data: runSteps } = await supabase
        .from("automation_run_steps")
        .select("id, status")
        .in("run_id", automationRuns?.map(r => r.id) || [])
        .limit(10);

      const hasSteps = (runSteps?.length || 0) > 0;

      checks.push({
        id: "automation_steps_logged",
        label: "Automation steps logged",
        description: "Run steps with request/response payloads",
        category: "automation",
        passed: hasSteps,
        details: hasSteps ? `${runSteps?.length} steps logged` : "No steps found",
      });

      return checks;
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  return {
    checks: query.data || [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
