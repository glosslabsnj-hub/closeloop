---
paths:
  - "supabase/functions/_shared/voiceContextContract*"
  - "supabase/functions/_shared/buildBusinessContext*"
  - "supabase/functions/_shared/getBusinessBrainSnapshot*"
  - "supabase/functions/twilio-inbound/**"
---
# Behavioral Rules: Voice Context & Dynamic Variables

When working on the voice context system (300+ dynamic variables), ALWAYS follow these procedures.

## When Adding a New Dynamic Variable

ALWAYS complete ALL of these steps (do not skip any):

1. **Add to registry** in `voiceContextContract.ts`:
   ```typescript
   my_new_variable: {
     key: "my_new_variable",
     source: (ctx) => ctx.some_data?.field || "default",
     defaultValue: "default",
     category: "appropriate_category",
   }
   ```
2. **Ensure the source data exists** in `getBusinessBrainSnapshot.ts` — add fetch if needed
3. **Reference in agent prompt** in `agentBasePrompts.ts` — add `{{my_new_variable}}` where appropriate
4. **HIPAA check** — if the variable contains PII (customer name, phone, health data), mark `hipaa_safe: false` and ensure it's redacted for medical tenants
5. **Size check** — remind user that total context is capped at 12KB. Large summaries (FAQs, services, menu) need compact formatting

## When Modifying buildBusinessContext

- ALWAYS verify that `getBusinessBrainSnapshot()` returns the data you need
- ALWAYS ensure null values are coerced to empty strings `""` before passing to ElevenLabs
- NEVER let undefined/null propagate into the dynamic variables object
- Test that the final context JSON stays under 12KB

## When Debugging Context Issues

Follow this sequence:
1. Check `getBusinessBrainSnapshot()` — is the data actually in the DB?
2. Check `voiceContextContract.ts` — is there a variable with a source function for this data?
3. Check the source function — does it handle null/undefined correctly?
4. Check `buildBusinessContext()` — is it called with the right parameters?
5. Check `twilio-inbound/index.ts` — is the context being passed to ElevenLabs `register-call`?
6. Check the agent prompt — does it reference `{{variable_name}}` correctly?

## HIPAA Rules (Automatic)

For medical tenants (`business_mode = 'medical'`):
- `caller_phone` → redact to `"[REDACTED]"`
- `memory_hints_summary` → set to `""`
- No customer-specific data in patterns/insights
- These are handled automatically but VERIFY when adding new variables

## Naming Conventions

- Lowercase with underscores: `dispatch_vehicle_timing`
- Prefix by category: `dispatch_*`, `service_*`, `food_*`, `medical_*`
- Suffix by type: `*_enabled` (boolean), `*_summary` (text), `*_count` (number)

## Size Optimization

If context exceeds 12KB:
1. Abbreviate large summary variables (compact JSON, shorter descriptions)
2. Truncate low-priority categories (debug, meta) first
3. Monitor via the `context_size_kb` meta variable
4. NEVER remove core/caller/hours variables to save space
