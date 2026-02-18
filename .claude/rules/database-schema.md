---
paths:
  - "supabase/**"
---
# Database Schema — Essential Tables

## Identity & Tenancy
- **tenants** — id, business_name, business_mode (enum: service|dispatch|food|medical|general), enabled_modules (JSONB array), capabilities_json, hipaa_mode, hours_json, pricing_rules_jsonb, eta_policy_jsonb, busyness_rules_jsonb, service_area_json, context_fields_json
- **tenant_users** — tenant_id, user_id, role (enum: owner|manager|staff|viewer). UNIQUE(tenant_id, user_id)
- **customers** — tenant_id, phone_e164 (UNIQUE together), phone_raw, full_name, email, tags[], source. `resolve_customer()` RPC handles upsert + conflict detection
- **customer_merge_queue** — conflict_type (name_mismatch|email_mismatch|both_mismatch), resolved flag

## AI & Voice
- **ai_call_sessions** — tenant_id, customer_id, twilio_call_sid, elevenlabs_conversation_id, transcript, summary, extracted_payload (JSONB = CanonicalPayload), outcome (booked|followup|lost|escalated), started_at, ended_at
- **ai_event_logs** — tenant_id, session_id, stage, event_data (JSONB). Stages: webhook_received, extraction_canonicalized, normalization_applied, summary_saved, customer_resolved, derived_entity_created
- **assistant_settings** — tenant_id (1:1), voice_ai_enabled, tone, greeting_script, fallback_script, same_day_enabled, waitlist_enabled, deposit_required, service_default_flow, unknown_question_behavior

## Entities (Created by Deterministic Routing)
- **bookings** — tenant_id, customer_id, service_id, session_id, scheduled_at, status (pending|confirmed|completed|canceled|no_show), notes
- **dispatch_jobs** — tenant_id, customer_id, job_number, status (pending|assigned|en_route|on_site|completed|cancelled), priority (low|normal|high|urgent), pickup/dropoff addresses + lat/lng, session_id, price_cents
- **food_orders** — tenant_id, customer_id, order_number, order_type (pickup|delivery), items_json (JSONB), subtotal/tax/total_cents, status (pending→confirmed→preparing→ready→out_for_delivery→completed→cancelled), session_id
- **reservations** — tenant_id, customer_id, party_size, reservation_date/time, status, special_requests
- **medical_intakes** — tenant_id, customer_id, intake_type, urgency_level, reason_for_visit, verbal_consent_given (HIPAA)

## Knowledge & Intelligence
- **business_faqs** — tenant_id, question, answer, priority_weight
- **objection_responses** — tenant_id, objection, response, priority_weight
- **knowledge_gaps** — tenant_id, gap_type, description, customer_question, occurrence_count, resolved
- **call_outcomes** — tenant_id, session_id, outcome_type, intent, conversion_value_cents, ai_handled_fully
- **business_patterns** — tenant_id, pattern_type (time|service_trend|objection|conversion|capacity|upsell), pattern_key (UNIQUE with tenant+type), confidence_score, observation_count, is_actionable
- **intelligence_insights** — tenant_id, insight_type, severity, title, description, recommended_action, is_read, is_actioned
- **revenue_attributions** — tenant_id, session_id, entity_type, entity_id, revenue_cents, UNIQUE(tenant_id, entity_type, entity_id). Auto-created by triggers on booking/dispatch_job/food_order insert

## Services & Pricing
- **services** — tenant_id, name, duration_minutes, price_type (fixed|quote_only|deposit_based), price_amount, is_active, upsell_suggestions[]
- **menu_items** — tenant_id, name, category, price_cents, dietary_tags[], prep_time_minutes
- **price_modifiers** — tenant_id, modifier_type, adjustment_type (fixed|percentage|multiplier), adjustment_value, applies_to_services[], active_days[]

## Automation & Delivery
- **automation_rules** — tenant_id, trigger_event, destination_provider, action_type, integration_id, field_mapping_json, behavior_json
- **automation_runs** — tenant_id, rule_id, trigger_event, entity_type, entity_id, status (pending|running|success|failed|skipped), payload_snapshot
- **handoff_attempts** — tenant_id, entity_type, entity_id, method, status, error_message
- **integrations** — tenant_id, provider (UNIQUE together), status, auth_type, config_json

## RLS Patterns
- **Pattern 1:** `has_tenant_access(auth.uid(), tenant_id)` — checks tenant_users membership
- **Pattern 2:** `tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())`
- **Pattern 3:** Role-based — owner-only or super_admin bypass
- All user-facing tables enforce tenant isolation via RLS
