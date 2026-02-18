---
paths:
  - "supabase/functions/process-call-outcome/**"
  - "supabase/functions/detect-patterns/**"
  - "supabase/functions/generate-insights/**"
  - "supabase/functions/build-weekly-digest/**"
  - "supabase/functions/record-observation/**"
  - "supabase/functions/retrieve-business-memory/**"
  - "supabase/functions/get-intelligence-dashboard/**"
  - "supabase/functions/analyze-call-outcome/**"
  - "src/components/intelligence/**"
  - "src/hooks/useIntelligence*"
---
# Behavioral Rules: Intelligence & Pattern Detection

When working on the intelligence system, ALWAYS follow these procedures.

## Intelligence Flow (understand before changing)

1. Call completes → `elevenlabs-webhook` calls `process-call-outcome`
2. Outcome logged to `call_outcomes` table
3. `detect-patterns` cron analyzes outcomes → updates `business_patterns`
4. `generate-insights` daily cron → synthesizes patterns into `intelligence_insights`
5. `record-observation` → stores customer preferences in `customer_observations`
6. `build-weekly-digest` weekly cron → comprehensive metrics summary

## HIPAA Rules (AUTOMATIC — enforce on every change)

Before writing ANY intelligence code, check: does this touch customer-specific data?

For medical tenants (`business_mode = 'medical'`):
- `memory_enabled` MUST be `false` — no customer observations stored
- `observation_retention_days` MUST be ≤ 30
- NEVER include customer-specific data in patterns or insights
- NEVER store PII in `business_patterns` or `intelligence_insights`
- These restrictions apply ONLY to medical tenants — do NOT add them to other modes

## When Adding a New Pattern Type

1. Add to `pattern_type` enum (migration required)
2. Add detection logic in `detect-patterns` function
3. Add to `generate-insights` synthesis logic
4. Add frontend display component in `src/components/intelligence/`
5. Ensure the pattern aggregates data — NEVER stores individual customer info
6. Test with both medical (HIPAA) and non-medical tenants

## When Modifying Outcome Processing

- `process-call-outcome` is called from the Golden Path (elevenlabs-webhook)
- Changes here affect EVERY call — test thoroughly
- ALWAYS log to `call_outcomes` before triggering downstream processing
- NEVER block the webhook response waiting for pattern detection
- Use async/fire-and-forget for `detect-patterns` trigger

## Pattern Types Reference

| Type | Example | Table |
|------|---------|-------|
| `time` | "Mondays 9-11am are 40% busier" | `business_patterns` |
| `service_trend` | "Oil changes up 3x in spring" | `business_patterns` |
| `objection` | "15% ask about pricing first" | `business_patterns` |
| `conversion` | "Same-day bookings convert 80%" | `business_patterns` |
| `capacity` | "Saturdays full 2 weeks ahead" | `business_patterns` |
| `upsell` | "Tire rotation → alignment 60%" | `business_patterns` |

## Key Tables

- `call_outcomes` — every call outcome with intent and conversion value
- `business_patterns` — detected patterns with confidence_score, observation_count
- `intelligence_insights` — actionable insights synthesized from patterns
- `knowledge_gaps` — questions AI couldn't answer confidently
- `customer_observations` — individual customer prefs (HIPAA: disabled for medical)
- `revenue_attributions` — auto-created by DB triggers on entity INSERT with session_id

## Key Files

- Outcome processor: `supabase/functions/process-call-outcome/index.ts`
- Pattern detector: `supabase/functions/detect-patterns/index.ts`
- Insight generator: `supabase/functions/generate-insights/index.ts`
- Weekly digest: `supabase/functions/build-weekly-digest/index.ts`
- Observation recorder: `supabase/functions/record-observation/index.ts`
- Frontend hooks: `src/hooks/useIntelligenceSettings.ts`
