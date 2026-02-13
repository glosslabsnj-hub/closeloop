# Phase 1: Onboarding Redesign — Implementation Record

## Status: COMPLETE

## Changes Made

### 1A. Business Profile Integration (Step 1)
**Files modified:**
- `src/components/onboarding/BusinessDetailsForm.tsx` — Added `locationType` field (single_shop | multiple_locations | mobile_only | shop_and_mobile)
- `src/pages/app/OnboardingPage.tsx` — BusinessDetailsForm now renders inline in Step 1 after industry selection

**What changed:**
- After selecting an industry, a "Tell us a bit more" section appears with: location, location type, team size, years in business, pricing position, call volume, customer type.
- `locationType` is new. Other fields already existed but were never rendered in onboarding.
- All fields save to `capabilities_json` with underscore-prefixed keys (e.g., `_locationType`, `_teamSize`).

### 1B. Deep Scenario Follow-Ups (Step 2)
**Files modified:**
- `src/lib/scenarioQuestions.ts` — Added `FollowUpField` interface and `followUp` property to `ScenarioQuestion`
- `src/components/onboarding/ScenarioDiscovery.tsx` — Renders inline follow-up fields when questions are answered "yes"

**Follow-ups added:**
| Question | Follow-up Fields |
|----------|-----------------|
| Deposits Required | Deposit type (fixed/percentage), Amount |
| Mobile/On-Site Service | Service radius (miles), Travel fee ($) |
| Same-Day/Emergency | Minimum lead time (1hr/2hr/4hr/morning) |
| Cancellation Policy (NEW) | Required notice (24/48/72hr), Cancellation fee ($) |
| Trip/Travel Fee | Fee amount ($) |
| Minimum Charge | Amount ($) |
| After-Hours Service | Surcharge amount ($) |
| Distance Pricing (dispatch) | Base/hookup rate ($), Per-mile rate ($) |
| Delivery (food) | Radius (miles), Delivery fee ($), Minimum order ($) |

**Data flow:**
- Follow-up values stored in `scenarioDetails: Record<string, string>` (separate from boolean answers)
- On completion, merged into `capabilities_json` with underscore prefix (e.g., `_depositAmount`)
- Pricing-related values also saved to `pricing_rules_jsonb` on tenants table
- Service radius updates `service_area_json`

### 1C. Team Setup (New Step 5)
**Files created:**
- `src/components/onboarding/TeamSetupStep.tsx` — New component

**What it does:**
- Solo operator toggle (default on) — skips team setup entirely
- Add team members: name, role (owner/manager/staff), phone, email
- Per-member service assignment: "All services" toggle or pick specific services
- Team data stored in `capabilities_json._team_members` as JSON array
- Foundation for Phase 3 `staff_members` table migration

### 1D. Pricing Deep Dive
Pricing data is now captured through scenario follow-ups (1B) rather than a separate step:
- Deposit amounts via deposits follow-up
- Trip fees via trip fee follow-up
- Minimum charges via minimum charge follow-up
- Distance rates via distance pricing follow-up
- All saved to `pricing_rules_jsonb`

### 1E. AI Behavior Enhancement (Step 6)
**Files modified:**
- `src/components/onboarding/CommunicationPreferences.tsx`

**New booking mode:** `suggest_callback` — AI checks availability and shares open times, then creates a callback for staff to confirm.

**New advanced section (collapsible):**
- **AI Guardrails:** Free-text field for things the AI should never promise
- **Required Intake Fields:** Toggle chips for what AI must collect before booking (name, phone, email, vehicle info, address, etc.)
- **Escalation Rules:** Toggle switches for when AI should escalate to a human (caller request, anger, price objection, complex question, complaint)
- **Escalation Fallback:** What to do if no human available (callback, voicemail, text owner)

**Data persistence:**
- All new fields saved to `assistant_settings.settings_json` as structured JSONB
- Keys: `ai_guardrails`, `required_intake_fields`, `escalation_rules`

### 1F. Onboarding Flow Update
**Files modified:**
- `src/pages/app/OnboardingPage.tsx` — 6 steps → 7 steps
- `src/components/onboarding/ConfirmationSummary.tsx` — Shows team info, updated booking mode labels

**New step order:**
1. Your Business (name + industry + business profile)
2. Discovery (scenarios with inline follow-ups)
3. Your Offerings (services)
4. Scheduling (hours & availability)
5. **Your Team** (NEW — staff setup)
6. AI Behavior (enhanced with 4 modes + advanced)
7. Review (shows team + updated labels)

## Data Persistence Summary

| Data | Stored In | Field |
|------|-----------|-------|
| Business profile | `tenants.capabilities_json` | `_teamSize`, `_locationType`, etc. |
| Scenario follow-ups | `tenants.capabilities_json` | `_depositAmount`, `_serviceRadiusMiles`, etc. |
| Pricing details | `tenants.pricing_rules_jsonb` | `deposit_type`, `base_rate`, `per_mile_rate`, etc. |
| Service radius | `tenants.service_area_json` | `radius_miles` |
| Team members | `tenants.capabilities_json._team_members` | JSON array (migrated to `staff_members` in Phase 3) |
| AI guardrails | `assistant_settings.settings_json` | `ai_guardrails` |
| Required intake | `assistant_settings.settings_json` | `required_intake_fields` |
| Escalation rules | `assistant_settings.settings_json` | `escalation_rules` |
| Booking mode | `assistant_settings.ai_booking_mode` | `suggest_callback` (new option) |

## Backward Compatibility
- All new fields are optional with sensible defaults
- Existing tenants unaffected — new fields only populated during new onboarding
- `scenarioDetails` defaults to empty object
- `isSoloOperator` defaults to true
- `CommunicationPrefs` new fields default to empty/basic values
- Old `pending_approval` booking mode still works alongside new `suggest_callback`
