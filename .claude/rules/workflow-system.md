---
paths:
  - "supabase/functions/_shared/**"
  - "src/components/brain/**"
  - "src/hooks/useWorkflow*"
---
# Workflow Configuration System

> **Zero Hard-Coded Business Logic:** Every AI agent adapts to each business's unique workflow via configurable settings.

## The Problem This Solves

**Before (Hard-coded):**
- DISPATCH prompt said: "Step 3: Get vehicle info" → worked for some towing companies, broke for others
- Hawks Towing needed vehicle type BEFORE pricing (affects quote for luxury vehicles)
- Joe's Towing needed vehicle type AFTER pricing (flat rate regardless)
- **Same agent, different needs** → hard-coded workflow doesn't work

**After (Configuration-driven):**
- Agent reads `{{dispatch_vehicle_timing}}` from Business Brain
- Hawks Towing sets: `vehicle_info_timing = "before_pricing"`
- Joe's Towing sets: `vehicle_info_timing = "after_pricing"`
- **Same agent, unique workflows** → every business gets exactly what they need

## Architecture

**Database Layer (5 tables):**
```
dispatch_workflow_config    (19 fields) - towing, roadside, courier
service_workflow_config     (15 fields) - booking, scheduling
food_workflow_config        (13 fields) - restaurant, catering
medical_workflow_config     (9 fields)  - healthcare, HIPAA
general_workflow_config     (6 fields)  - lead capture, callbacks
```

**Backend Layer (40+ dynamic variables):**
- All workflow configs exposed via `voiceContextContract.ts`
- Fetched in `getBusinessBrainSnapshot.ts`
- Passed to ElevenLabs as dynamic variables
- Example vars: `dispatch_vehicle_timing`, `service_deposit_timing`, `food_allow_customizations`

**Agent Layer (5 prompts rewritten):**
- `DISPATCH_AGENT_BASE_PROMPT` - reads vehicle timing, luxury protocols, payment timing
- `SERVICE_AGENT_BASE_PROMPT` - reads deposit timing, alternatives, confirmations
- `FOOD_AGENT_BASE_PROMPT` - reads order type logic, customizations, allergy checks
- `MEDICAL_AGENT_BASE_PROMPT` - reads HIPAA consent timing, emergency detection
- `GENERAL_AGENT_BASE_PROMPT` - reads callback behavior, unknown question handling

**UI Layer (Business Brain):**
- New tab: Business Brain → Workflow Config
- Mode-specific components: `DispatchWorkflowConfig.tsx`, `ServiceWorkflowConfig.tsx`, etc.
- Real-time save/update with `useWorkflowConfig` hooks
- Changes propagate to live agents within 1 minute

## Key Configuration Areas

**DISPATCH Mode (19 settings):**
1. **Vehicle Collection:** before_pricing / after_pricing / optional
2. **Luxury Protocols:** flatbed recommendation, AWD detection, luxury brands list
3. **Payment:** timing (upfront/on_arrival/invoiced), methods, confirmation scripts
4. **Address:** geocoding confirmation, ZIP requirement, confirmation scripts
5. **Expectations:** driver callback scripts, direct contact info

**SERVICE Mode (15 settings):**
1. **Intake:** duration collection, service-specific questions
2. **Deposits:** timing (before_booking/at_confirmation/day_before), amount behavior
3. **Scheduling:** alternative suggestions, max alternatives, window days
4. **Confirmation:** booking scripts, SMS/email confirmations
5. **Permissions:** AI rescheduling, AI cancellation, manager requirements

**FOOD Mode (13 settings):**
1. **Order Type:** when to ask pickup vs delivery, default type
2. **Timing:** ASAP vs scheduled, minimum advance minutes
3. **Customizations:** allow modifications, allergy checks, special instructions
4. **Delivery:** instructions collection, buzzer code requirements
5. **Confirmation:** repeat order back, confirm total, confirmation scripts

**MEDICAL Mode (9 settings):**
1. **HIPAA Consent:** timing (before_intake/after_reason/at_end), scripts
2. **Symptom Collection:** detail level, severity scale, duration questions
3. **Emergency:** keyword detection, escalation scripts

**GENERAL Mode (6 settings):**
1. **Callbacks:** ask best time, ask reason, confirmation scripts
2. **Unknown Questions:** escalate to callback, unknown question scripts

## Configuration Priority

```
workflow_config (DB) > mode defaults > hard-coded fallbacks
```

If workflow config missing → use mode defaults
If mode defaults missing → use hard-coded fallbacks
**Never crash, always have a value**

## Files to Know

**Database:**
- `supabase/migrations/20260217_workflow_configs.sql` - Creates 5 tables + RLS + triggers

**Backend:**
- `_shared/getBusinessBrainSnapshot.ts` - Fetches workflow configs
- `_shared/voiceContextContract.ts` - Exposes 40+ workflow variables
- `_shared/agentBasePrompts.ts` - All agent prompts (config-driven)

**Frontend:**
- `src/hooks/useWorkflowConfig.ts` - React Query hooks for CRUD
- `src/components/brain/WorkflowConfigEditor.tsx` - Main container
- `src/components/brain/DispatchWorkflowConfig.tsx` - Dispatch settings UI
- `src/components/brain/ServiceWorkflowConfig.tsx` - Service settings UI
- `src/components/brain/FoodWorkflowConfig.tsx` - Food settings UI
- `src/components/brain/MedicalWorkflowConfig.tsx` - Medical settings UI
- `src/components/brain/GeneralWorkflowConfig.tsx` - General settings UI
- `src/pages/app/BusinessBrainPage.tsx` - Added workflow tab
- `src/config/brainModeLayout.ts` - Added workflow to all mode layouts

## Common Workflows

**Add new workflow setting:**
1. Add column to appropriate `*_workflow_config` table (migration)
2. Add to TypeScript interface in `useWorkflowConfig.ts`
3. Add variable to `voiceContextContract.ts` registry
4. Reference in agent prompt (`agentBasePrompts.ts`)
5. Add UI control in mode-specific config component
6. Update defaults in migration seed data

**Change existing workflow:**
1. Navigate to Business Brain → Workflow Config
2. Modify settings via UI
3. Click "Save Changes"
4. Changes propagate to live agent within 1 minute
5. Test with real call to verify

**Debug workflow issue:**
1. Check config in database: `SELECT * FROM dispatch_workflow_config WHERE tenant_id = '...'`
2. Check dynamic variables in call logs (search for `dispatch_vehicle_timing`)
3. Verify agent prompt has conditional logic for that variable
4. Test with different config values to isolate issue

## Known Constraints

- Workflow configs are per-tenant, NOT per-location (multi-location businesses share config)
- Changes require page refresh for UI to reflect (1-min cache)
- Agent prompts don't support true templating (use conditional text instead)
- Configs applied at call START (mid-call config changes don't take effect)
