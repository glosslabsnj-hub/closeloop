const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

console.log('=== ADD DYNAMIC VARIABLES TO DISPATCH AGENT ===\n');

// All 158 dynamic variable placeholders with defaults
const DYNAMIC_VARS = {
  dynamic_variable_placeholders: {
    // Core (15 variables)
    "tenant_id": "pending",
    "location_id": "default",
    "business_name": "Our Business",
    "business_tagline": "not set",
    "years_in_business": "not set",
    "website_url": "not set",
    "business_mode": "dispatch",
    "industry_type": "general",
    "enabled_modules": "ai_voice,dispatch_queue",
    "hipaa_mode": "false",
    "capabilities_list": "dispatch",
    "timezone": "America/New_York",
    "business_address": "not set",
    "location_summary": "not set",
    "service_area_summary": "not set",

    // Dispatch-specific (26 variables)
    "has_dispatch": "true",
    "has_emergency_dispatch": "true",
    "has_fleet": "false",
    "has_impound": "false",
    "has_eta_tracking": "false",
    "has_mobile_service": "false",
    "is_dispatch_business": "true",
    "dispatch_default_flow": "immediate_first",
    "dispatch_intake_fields_summary": "location, name, problem description",
    "vehicle_knowledge_summary": "not applicable",
    "roadside_safety_scripts": "Stay safe, stay in your vehicle with hazards on.",
    "impound_lot_id": "not applicable",
    "impound_lot_name": "not applicable",
    "impound_lot_address": "not applicable",
    "impound_lot_phone": "not applicable",
    "impound_lot_hours_today": "not applicable",
    "impound_lot_hours_summary": "not applicable",
    "impound_is_open_now": "false",
    "impound_next_open": "not applicable",
    "impound_base_tow_fee": "not applicable",
    "impound_daily_storage_fee": "not applicable",
    "impound_admin_fee": "not applicable",
    "impound_gate_fee": "not applicable",
    "impound_fee_summary": "not applicable",
    "impound_release_requirements": "not applicable",
    "impound_release_requirements_summary": "not applicable",
    "impound_accepted_payment": "not applicable",

    // Caller context (7 variables)
    "caller_phone": "unknown",
    "caller_phone_last4": "unknown",
    "customer_id": "new",
    "customer_order_count": "0",
    "customer_name_from_lookup": "none",
    "active_job_summary": "none",
    "memory_hints_summary": "none",

    // Hours & availability (5 variables)
    "hours_today": "not set",
    "calendar_connected": "false",
    "booking_link": "not set",
    "same_day_enabled": "true",
    "confirmation_method": "sms",

    // Pricing & ETA (15 variables)
    "pricing_rules_summary": "standard pricing",
    "eta_rules_summary": "standard response times",
    "eta_policy_summary": "standard ETA policy",
    "base_prep_minutes": "30",
    "busy_buffer_minutes": "15",
    "current_busyness_pct": "0",
    "response_time_spoken": "30 to 45 minutes",
    "response_time_min": "30",
    "response_time_max": "60",
    "eta_source": "mode_default",
    "distance_provider_enabled": "false",
    "trip_fee_summary": "none",
    "price_modifiers_summary": "none",
    "emergency_surcharge": "none",
    "financing_available": "false",

    // Policies & Knowledge (10 variables)
    "policies_summary": "standard policies apply",
    "faqs_summary": "none configured",
    "objections_summary": "none configured",
    "knowledge_summary": "none configured",
    "ai_guidelines_summary": "follow standard operating procedures",
    "intent_rules_summary": "none configured",
    "required_questions_summary": "none configured",
    "required_intake_fields_summary": "customer name, phone number, location",
    "escalation_rules_summary": "Transfer when caller requests it",
    "out_of_area_message": "We may not service that area",

    // AI behavior (15 variables)
    "ai_behavior_mode": "full_service",
    "ai_booking_mode": "auto_confirm",
    "ai_upselling_guidance": "none",
    "ai_pricing_negotiation": "none",
    "ai_capacity_guidance": "none",
    "ai_escalation_guidance": "transfer when caller requests",
    "ai_recognition_guidance": "none",
    "ai_max_discount_percent": "0",
    "ai_loyalty_threshold_orders": "5",
    "ai_never_promise": "none",
    "ai_guardrails": "none",
    "tone": "fast, confident, capable",
    "greeting_script": "not set",
    "fallback_script": "not set",
    "memory_enabled": "false",

    // Team (2 variables)
    "team_size": "0",
    "staff_names": "not set",

    // Competitor positioning (3 variables)
    "competitor_positioning_summary": "none",
    "competitor_never_say": "none",
    "our_advantages_summary": "none",

    // Business Brain metadata (10 variables)
    "business_brain_summary": "not configured yet",
    "business_brain_json": "{}",
    "business_brain_json_compact": "{}",
    "business_brain_json_hash": "none",
    "business_brain_json_truncated": "false",
    "context_has_hours": "false",
    "context_has_services": "false",
    "context_services_count": "0",
    "context_missing_sections": "none",
    "context_contract_version": "v1",

    // Service area (1 variable)
    "service_area_rules_json": "{}",

    // Booking-specific (not used in dispatch but needed for compatibility) (9 variables)
    "has_booking": "false",
    "has_estimates": "false",
    "has_calendar_sync": "false",
    "has_after_hours_handling": "false",
    "has_knowledge_base": "false",
    "is_scheduling_business": "false",
    "is_service_business": "false",
    "service_summary": "not set",
    "services_pricing": "not set",
    "secondary_services_summary": "none",

    // Menu/food (not used in dispatch but needed) (2 variables)
    "menu_summary": "not applicable",
    "packages_summary": "none",
    "estimated_prep_minutes": "not applicable",
    "accepts_pickup": "false",

    // System (2 variables)
    "twilio_call_sid": "pending",
    "dynamic_variables_keys": "all"
  }
};

async function main() {
  console.log('Step 1: Fetching current DISPATCH agent configuration...');

  const getResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to get agent: ${getResponse.status}`);
  }

  const currentAgent = await getResponse.json();
  console.log('   ✓ Retrieved current configuration\n');

  console.log('Step 2: Updating agent with dynamic variables...');

  // Remove tools field to avoid conflict
  const promptWithoutTools = { ...currentAgent.conversation_config.agent.prompt };
  delete promptWithoutTools.tools;

  const updatePayload = {
    conversation_config: {
      ...currentAgent.conversation_config,
      agent: {
        ...currentAgent.conversation_config.agent,
        dynamic_variables: DYNAMIC_VARS,
        prompt: promptWithoutTools  // Keep existing prompt without tools field
      }
    }
  };

  const updateResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update agent: ${updateResponse.status} - ${error}`);
  }

  console.log('   ✓ Dynamic variables added successfully\n');

  console.log('Step 3: Verifying update...');
  const verifyResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  const verifiedAgent = await verifyResponse.json();
  const varCount = Object.keys(verifiedAgent.conversation_config.agent.dynamic_variables?.dynamic_variable_placeholders || {}).length;

  console.log(`   Dynamic variables configured: ${varCount}\n`);

  if (varCount > 0) {
    console.log('   ✓ VERIFIED: Dynamic variables successfully added\n');
  } else {
    console.log('   ⚠️  WARNING: No dynamic variables found in agent config\n');
  }

  console.log('=== DYNAMIC VARIABLES UPDATE COMPLETE ===');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check ElevenLabs dashboard → DISPATCH agent → Edit');
  console.log('2. Verify no "Required" errors on dynamic variables');
  console.log('3. Try to save the system prompt');
  console.log(`\nConfigured ${varCount} dynamic variables`);
}

main().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
