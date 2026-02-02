# Voice Context Variables Inventory

> **Last Updated:** 2026-02-02
> **Source:** `supabase/functions/_shared/buildBusinessContext.ts`
> **Related Files:** `elevenlabs-init/index.ts`, `elevenlabs-conversation-token/index.ts`

This document provides a comprehensive inventory of all business context variables that are injected into ElevenLabs voice AI agents via the `dynamic_variables` mechanism.

---

## A. Complete Variable List

| Variable Key | Type | Source Table(s) | Source Field(s) | HIPAA Safe | Can Be Empty |
|-------------|------|-----------------|-----------------|------------|--------------|
| `tenant_id` | string | voice routing | resolved from `phone_numbers` or `tenants.phone_public` | ✅ | No |
| `location_id` | string | voice routing | `phone_numbers.location_id` | ✅ | Yes |
| `business_name` | string | `tenants` | `business_name` | ✅ | No (defaults to "Our Business") |
| `businessname` | string | `tenants` | `business_name` (alias) | ✅ | No (defaults to "Our Business") |
| `business_mode` | string | `tenants` | `business_mode` | ✅ | No (defaults to "general") |
| `enabled_modules` | string | `tenants` | `enabled_modules` (computed) | ✅ | Yes |
| `hipaa_mode` | boolean | `data_retention_settings` | computed | ✅ | No |
| `timezone` | string | `tenants` | `timezone` | ✅ | No (defaults to "America/New_York") |
| `caller_phone` | string | runtime | call metadata | ⚠️ PHI | Yes (empty if HIPAA) |
| `customer_id` | string | `customers` | `id` | ✅ | Yes |
| `hours_today` | string | `tenants` | `hours_json` (computed) | ✅ | Yes |
| `calendar_connected` | boolean | `assistant_settings` | `calendar_connected` | ✅ | No |
| `booking_link` | string | `assistant_settings` | `booking_url` | ✅ | Yes |
| `service_summary` | string | `services` | computed summary | ✅ | Yes |
| `services_pricing` | string | `services` | computed for prompt | ✅ | Yes |
| `menu_summary` | string | `menu_items` | computed summary | ✅ | Yes |
| `pricing_rules_summary` | string | `tenants` | `pricing_rules_jsonb` (computed) | ✅ | Yes |
| `eta_rules_summary` | string | `tenants` | `eta_policy_jsonb` (computed) | ✅ | Yes |
| `policies_summary` | string | `tenants` | cancellation, deposit, payment | ✅ | Yes |
| `faqs_summary` | string | `business_faqs` | computed summary | ✅ | Yes |
| `menu_has_more` | string | `menu_items` | computed (>50 items) | ✅ | No ("true"/"false") |
| `menu_top_categories` | string | `menu_items` | computed top 5 categories | ✅ | Yes |
| `menu_summary_length` | string | computed | character count | ✅ | No |
| `estimated_prep_minutes` | number | `tenant_food_settings` | `estimated_prep_minutes` | ✅ | No (defaults to 15) |
| `accepts_pickup` | string | `tenant_food_settings` | `accepts_pickup` | ✅ | No ("true"/"false") |
| `accepts_delivery` | string | `tenant_food_settings` | `accepts_delivery` | ✅ | No ("true"/"false") |
| `accepts_dine_in` | string | `tenant_food_settings` | `accepts_dine_in` | ✅ | No ("true"/"false") |
| `delivery_radius_miles` | string | `tenant_food_settings` | `delivery_radius_miles` | ✅ | Yes |
| `delivery_minimum_dollars` | string | `tenant_food_settings` | `delivery_minimum_cents` (converted) | ✅ | Yes |
| `accepts_catering` | string | `tenant_food_settings` | `accepts_catering` | ✅ | No ("true"/"false") |
| `greeting_script` | string | `ai_assistants` | `greeting_script` | ✅ | Yes |
| `fallback_script` | string | `ai_assistants` | `fallback_script` | ✅ | Yes |
| `tone` | string | `ai_assistants` | `tone` | ✅ | No (defaults to "friendly") |
| `intent_rules_summary` | string | `business_intent_rules` | computed summary | ✅ | Yes |
| `required_questions_summary` | string | `assistant_settings` | `required_questions` (computed) | ✅ | No (defaults to "No required questions configured") |
| `memory_hints_summary` | string | `business_memory` | computed | ⚠️ PHI | Yes (empty if HIPAA) |
| `memory_enabled` | boolean | `tenant_intelligence_settings` | `memory_enabled` | ✅ | No |
| `base_prep_minutes` | number | `tenants` | `busyness_rules_jsonb.base_prep_minutes` | ✅ | No (defaults to 30) |
| `busy_buffer_minutes` | number | `tenants` | `busyness_rules_jsonb.busy_buffer_minutes` | ✅ | No (defaults to 15) |
| `current_busyness_pct` | number | `tenants` | `busyness_rules_jsonb.manual_busyness_pct` | ✅ | No (defaults to 0) |
| `context_has_hours` | string | computed | debug flag | ✅ | No ("true"/"false") |
| `context_has_menu` | string | computed | debug flag | ✅ | No ("true"/"false") |
| `context_has_services` | string | computed | debug flag | ✅ | No ("true"/"false") |
| `context_menu_count` | string | computed | debug flag | ✅ | No |
| `context_services_count` | string | computed | debug flag | ✅ | No |
| `context_missing_sections` | string | computed | debug flag | ✅ | Yes |

---

## B. Source Tables Reference

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `tenants` | `id`, `business_name`, `business_mode`, `timezone`, `address`, `hours_json`, `enabled_modules`, `pricing_rules_jsonb`, `busyness_rules_jsonb`, `eta_policy_jsonb`, `cancellation_policy`, `deposit_policy`, `accepted_payments` | Core business identity and configuration |
| `services` | `id`, `name`, `description`, `price_type`, `price_amount`, `duration_minutes`, `deposit_required`, `deposit_amount`, `prep_instructions` | Service offerings (service mode) |
| `menu_items` | `id`, `name`, `description`, `category`, `price_cents`, `modifiers`, `dietary_tags`, `is_available` | Menu items (food mode) |
| `business_faqs` | `question`, `answer`, `priority_weight` | Knowledge base FAQs |
| `objection_responses` | `objection`, `response`, `priority_weight` | Sales objection handling |
| `ai_knowledge_base` | `type`, `title`, `content`, `priority_weight` | Supplementary knowledge |
| `ai_assistants` | `tone`, `greeting_script`, `fallback_script` | Voice agent personality |
| `assistant_settings` | `calendar_connected`, `booking_url`, `booking_mode`, `required_questions` | Operational settings |
| `tenant_intelligence_settings` | `memory_enabled`, `min_confidence`, `share_across_locations` | Intelligence layer config |
| `data_retention_settings` | `store_transcripts`, `store_recordings`, `store_caller_phone`, `hipaa_mode`, `phi_minimization` | Privacy and compliance |
| `tenant_food_settings` | `estimated_prep_minutes`, `accepts_pickup`, `accepts_delivery`, `accepts_dine_in`, `delivery_radius_miles`, `delivery_minimum_cents`, `accepts_catering` | Food-specific settings |
| `business_intent_rules` | `name`, `rule_type`, `action`, `priority` | Custom intent routing |
| `business_memory` | `type`, `summary`, `usage`, `confidence` | Customer memory hints |
| `customers` | `id` (resolved from phone) | Caller identity |

---

## C. Variables by Business Mode

### All Modes (Universal)
- `tenant_id`, `location_id`, `business_name`, `businessname`, `business_mode`
- `enabled_modules`, `hipaa_mode`, `timezone`
- `caller_phone`, `customer_id`
- `hours_today`, `calendar_connected`, `booking_link`
- `policies_summary`, `faqs_summary`
- `greeting_script`, `fallback_script`, `tone`
- `intent_rules_summary`, `required_questions_summary`
- `memory_hints_summary`, `memory_enabled`
- Debug flags: `context_*`

### Food Mode (`business_mode = "food"`)
- `menu_summary` (primary content)
- `menu_has_more`, `menu_top_categories`, `menu_summary_length`
- `estimated_prep_minutes`, `accepts_pickup`, `accepts_delivery`, `accepts_dine_in`
- `delivery_radius_miles`, `delivery_minimum_dollars`, `accepts_catering`

### Service/Dispatch Mode (`business_mode = "service"` or `"dispatch"`)
- `service_summary` (primary content)
- `services_pricing`
- `pricing_rules_summary`
- `eta_rules_summary`
- `base_prep_minutes`, `busy_buffer_minutes`, `current_busyness_pct`

---

## D. HIPAA Considerations

### PHI Variables (Redacted in HIPAA Mode)
| Variable | Behavior in HIPAA Mode |
|----------|------------------------|
| `caller_phone` | Returns empty string `""` |
| `memory_hints_summary` | Returns empty string `""` |

### Safe for All Modes
All other variables contain only business configuration data (pricing, hours, policies, etc.) and are safe to include regardless of HIPAA mode.

### HIPAA Mode Detection
```typescript
hipaa_mode: ctx.safety.hipaa_mode  // true if tenant has medical intake enabled
```

---

## E. ElevenLabs System Prompt Injection

### How Variables Are Used

ElevenLabs receives these variables in two ways:

1. **Dynamic Variables Injection** - Variables are passed to ElevenLabs via the `dynamic_variables` field in the conversation configuration. ElevenLabs can reference these directly in agent prompts.

2. **System Prompt Assembly** - The `buildSystemPrompt()` function (lines 1061-1606 in buildBusinessContext.ts) assembles a comprehensive system prompt using template literals that directly reference the BusinessContext.

### Key Prompt Sections Built

| Section | Context Source | Notes |
|---------|---------------|-------|
| BUSINESS INFORMATION | `ctx.tenant.*` | Name, mode, tagline, hours |
| TODAY'S HOURS | `ctx.tenant.hours_today` | Computed from hours_json |
| YOUR CAPABILITIES | `ctx.operations.modules.*` | Enabled features |
| SERVICES/MENU | `ctx.offerings.*` | Service or menu summary |
| PRICING INFORMATION | `ctx.pricing.rules_summary` | Pricing rules |
| ETA ESTIMATION | `ctx.eta.*` | ETA ranges and rules |
| POLICIES | `ctx.policies.*` | Cancellation, deposit, refund |
| FREQUENTLY ASKED QUESTIONS | `ctx.knowledge.faqs_summary` | FAQ answers |
| CUSTOMER CONTEXT | `ctx.intelligence.memory_hints` | Previous interactions |
| ASSISTANT PERSONALITY | `ctx.ai_settings.*` | Tone, scripts |

### Template Placeholders Note

The codebase uses `{{placeholder}}` syntax in workflow templates (SMS, email automation), but **NOT** in ElevenLabs prompts. ElevenLabs uses direct string interpolation via template literals:

```typescript
// Example from buildSystemPrompt():
prompt += `You are an AI assistant for ${ctx.tenant.business_name}.\n`;
prompt += `Today's hours: ${ctx.tenant.hours_today}\n`;
```

---

## F. Missing/Unused Analysis

### Variables Present in Context but NOT in dynamic_variables

The following fields exist in `BusinessContext` but are not exposed via `buildDynamicVariables()`:

| Field | Location | Recommendation |
|-------|----------|----------------|
| `tenant.address` | `ctx.tenant.address` | **SHOULD ADD** - AI can't answer "where are you located?" |
| `tenant.tagline` | `ctx.tenant.tagline` | Consider adding for brand context |
| `tenant.website` | `ctx.tenant.website` | Consider adding for directing customers |
| `tenant.phone_e164` | `ctx.tenant.phone_e164` | Consider adding for callback info |
| `tenant.service_area` | `ctx.tenant.service_area` | **SHOULD ADD** - For dispatch coverage questions |
| `eta.spoken` | `ctx.eta.spoken` | Already in prompt, but could be explicit variable |
| `food_settings.catering_min_guests` | `ctx.food_settings.catering_min_guests` | Add for catering inquiries |
| `food_settings.catering_lead_days` | `ctx.food_settings.catering_lead_days` | Add for catering inquiries |

### Debug Context Page

The `/debug/ai-context` page reads these variables to verify context completeness:
- `context_has_hours`
- `context_has_menu`
- `context_has_services`
- `context_menu_count`
- `context_services_count`
- `context_missing_sections`

---

## G. Tenant Resolution

### How tenant_id is Resolved

Voice sessions resolve tenant_id through these strategies (in order):

1. **Phone Calls (elevenlabs-init):**
   - **Primary:** Lookup `phone_numbers` table by `to_number` (E.164 normalized)
   - **Fallback:** Lookup `tenants.phone_public` by `to_number`
   - **If no match:** Returns empty `tenant_id` (no demo fallback)

2. **Browser Tests (elevenlabs-conversation-token):**
   - Receives `tenantId` from request body (from authenticated user's tenant)
   - Validates tenant exists in database

### Resolution Source Tracking

The `voice_tenant_resolved` event logs how tenant was resolved:

```typescript
event_data: {
  tenant_id: "uuid",
  source: "phone_numbers" | "tenants_phone_public" | "explicit" | "lookup_failed",
  has_location_id: boolean,
  channel: "voice" | "browser_test"
}
```

### Troubleshooting "Wrong Tenant"

If calls are using the wrong tenant:
1. Check `ai_event_logs` for `voice_tenant_resolved` events
2. Verify the business phone number is in `phone_numbers` table with correct `tenant_id`
3. Or verify `tenants.phone_public` matches the Twilio/ElevenLabs "To" number

---

## H. Logging Events

### Existing Events
- `voice_tenant_resolved` - Logged when tenant is resolved from phone number
- `voice_context_injected` - Logged when dynamic variables are injected
- `eta_computed` - Logged when ETA is calculated (includes distance, duration, confidence)
- `eta_fallback` - Logged when falling back to baseline estimate
- `eta_blocked_missing_address` - Logged when address geocoding fails
- `elevenlabs_init_tenant_not_found` - Logged when no tenant matches the phone number

### voice_context_injected Event

```typescript
// Log at session start to track what context was injected
await supabase.from("ai_event_logs").insert({
  tenant_id: tenantId,
  stage: "voice_context_injected",
  event_data: {
    keys_present: Object.keys(dynamicVariables),
    keys_empty: Object.keys(dynamicVariables).filter(k => !dynamicVariables[k]),
    hipaa_mode: dynamicVariables.hipaa_mode,
    business_mode: dynamicVariables.business_mode,
    enabled_modules: dynamicVariables.enabled_modules,
    context_missing_sections: dynamicVariables.context_missing_sections,
  },
});
```

---

## H. Quick Reference Card

### For Developers

```typescript
// Import
import { buildDynamicVariables, buildBusinessContext } from "./_shared/buildBusinessContext";

// Usage
const ctx = await buildBusinessContext(supabase, tenantId, { channel: "voice", sessionId });
const vars = buildDynamicVariables(ctx, callerPhone, customerId);

// Pass to ElevenLabs
{ dynamic_variables: vars }
```

### For AI Prompt Engineers

Key variables available in ElevenLabs agent prompts:
- `{{business_name}}` - Business name
- `{{hours_today}}` - Today's hours
- `{{menu_summary}}` or `{{services_pricing}}` - Offerings
- `{{eta_rules_summary}}` - ETA information
- `{{faqs_summary}}` - FAQ answers
- `{{greeting_script}}` - Opening script
- `{{tone}}` - Voice personality

### Total Variables: 44

- Core identifiers: 8
- Caller info: 2
- Hours/availability: 3
- Business Brain content: 6
- Menu metadata: 3
- Food settings: 7
- AI settings: 3
- Intelligence: 4
- Pricing/ETA: 4
- Debug flags: 6
