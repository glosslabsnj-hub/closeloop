---
paths:
  - "src/components/brain/**"
  - "src/hooks/useBrain*"
  - "src/hooks/useWorkflowConfig*"
  - "src/pages/app/BusinessBrainPage*"
  - "src/config/brainModeLayout*"
  - "supabase/functions/retrieve-knowledge/**"
  - "supabase/functions/process-knowledge-upload/**"
---
# Behavioral Rules: Business Brain Knowledge Management

When working on Business Brain components, hooks, or knowledge functions, ALWAYS follow these procedures.

## Business Brain Is the Single Editor

**CRITICAL RULE:** Only `/app/business-brain` can WRITE business knowledge. All other pages are READ-ONLY with "Edit in Business Brain" CTAs.

Exceptions:
- Mode/industry sliders write ONLY via `writeBrainFact.ts` functions
- Knowledge uploads go to Review Queue — require explicit approval before live

NEVER add knowledge editing to pages outside Business Brain.

## How Changes Propagate to AI

Business Brain data → `getBusinessBrainSnapshot()` → `voiceContextContract.ts` → dynamic variables → ElevenLabs agent

Changes propagate within ~1 minute (next call picks up new data). UI needs page refresh to reflect.

## When Adding a New Knowledge Section

Complete ALL steps:
1. **Add DB table/column** (migration) for the new data
2. **Add to `getBusinessBrainSnapshot()`** — fetch the new data
3. **Add dynamic variable** in `voiceContextContract.ts` — expose to agents
4. **Add to agent prompt** in `agentBasePrompts.ts` — reference `{{variable_name}}`
5. **Add React hook** for CRUD (follow `useWorkflowConfig.ts` pattern)
6. **Add UI component** in `src/components/brain/` — follow existing component patterns
7. **Add to mode layout** in `brainModeLayout.ts` — show in correct modes
8. **Add to BusinessBrainPage** — register the new tab/section

## When Editing Workflow Config Components

- 5 mode-specific components: `DispatchWorkflowConfig.tsx`, `ServiceWorkflowConfig.tsx`, `FoodWorkflowConfig.tsx`, `MedicalWorkflowConfig.tsx`, `GeneralWorkflowConfig.tsx`
- Each uses `useWorkflowConfig` hooks for CRUD
- Config priority: `workflow_config` (DB) > mode defaults > hard-coded fallbacks
- NEVER crash if config is missing — always fall back to defaults

## When Working on Knowledge Upload

- Uploads go to Review Queue first — NEVER auto-apply
- "Structured truth wins" — existing DB data takes precedence until owner resolves conflicts
- `process-knowledge-upload` validates and queues the upload
- Owner must explicitly approve before data goes live

## Business Brain Duplication Warning

"Order Settings" and "Distance Pricing" appear in 2 places each in the Brain UI. When editing one, check if the other also needs updating.

## Mode-Specific Sections

| Mode | Key Sections |
|------|-------------|
| service | Services, Policies, FAQs, Workflow Config |
| dispatch | Services, Pricing, Policies (9 sections), Service Area, Workflow Config |
| food | Menu, Order Settings, Delivery, FAQs, Workflow Config |
| medical | Services, HIPAA Settings, Medical Intake, Workflow Config |
| general | FAQs, Callback Settings, Workflow Config |

## Key Files

- Main page: `src/pages/app/BusinessBrainPage.tsx`
- Mode layouts: `src/config/brainModeLayout.ts`
- Brain components: `src/components/brain/` (60+ files)
- Workflow hooks: `src/hooks/useWorkflowConfig.ts`
- Brain completion: `src/hooks/useBrainCompletion.ts`
- Knowledge retrieval: `supabase/functions/retrieve-knowledge/index.ts`
- Knowledge upload: `supabase/functions/process-knowledge-upload/index.ts`
- Brain snapshot: `supabase/functions/_shared/getBusinessBrainSnapshot.ts`
