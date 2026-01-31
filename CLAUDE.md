# CloseLoop Operating Rules

This document defines the operating rules for all development work on the CloseLoop platform.

## CLOSELOOP NORTH STAR

**"Every lead gets answered. Every opportunity gets pushed to booking."**

## GOLDEN PATH (must not break)

Twilio inbound → twilio-inbound → buildBusinessContext → ElevenLabs register-call → conversation → elevenlabs-webhook → CanonicalPayload → deterministic routing (intent × enabled_modules) → handoff functions → automation runs → handoff attempts logged.

## NON-NEGOTIABLES

- **No hardcoded demo data in product paths.** All app pages read/write real DB data.
- **customers is the single source of truth for identity.** Unique constraint is (tenant_id, phone_e164). Always normalize to E.164.
- **Behavior is driven ONLY by business_mode + enabled_modules** (industry is only for defaults/templates).
- **Twilio inbound must always return HTTP 200 + valid TwiML, even on errors.**
- **Never pass nulls to ElevenLabs dynamic variables** (use empty strings). Never speak placeholders like "None."
- **HIPAA rules apply ONLY to medical tenants.** Must not affect other tenants.
- **Knowledge uploads require approval;** "structured truth wins" until owner resolves.

## DATA + INTELLIGENCE PRINCIPLES (for "one of a kind AI")

- **AI must store data only in the correct canonical tables** (sessions → extracted payload → derived entities).
- **Use deterministic routing;** never create entities for modules that are disabled.
- **Prefer structured storage** (canonical payload, extracted fields, intent rules) over raw text.
- **Capture "knowledge gaps"** when the AI is asked something it cannot answer confidently.
