---
paths:
  - "supabase/functions/_shared/voiceContextContract*"
  - "supabase/functions/_shared/buildBusinessContext*"
---
# Dynamic Variables (300+ for ElevenLabs)

Categories: core (tenant_id, business_name, business_mode, enabled_modules, timezone), caller (caller_phone, customer_id, customer_order_count), hours (hours_today, booking_link), offerings (service_summary, menu_summary, packages_summary), pricing (pricing_rules_summary, eta_rules_summary, response_time_spoken), policies (cancellation_policy, faqs_summary, ai_guidelines_summary), ai_settings (tone, greeting_script, ai_booking_mode), intelligence (required_questions_summary, memory_hints_summary), food (estimated_prep_minutes, accepts_pickup), debug, meta.

**HIPAA Safe:** All variables safe except `caller_phone` (redacted) and `memory_hints_summary` (empty) in HIPAA mode.

**Size Limit:** Compact JSON capped at 12KB.
