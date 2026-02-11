

# AI Brain Builder -- Conversational Setup Assistant

## What This Does
Instead of manually navigating dozens of Brain sections, a friendly AI chatbot interviews you about your business in plain English. As you answer, it automatically fills in the Business Brain fields behind the scenes. By the time you finish the conversation, your AI receptionist should be ~90% ready.

## How It Works

```text
+------------------+       +-------------------+       +------------------+
|  Chat Interface  | ----> | Edge Function     | ----> | Database Writes  |
|  (React Panel)   |       | brain-builder-chat|       | via writeBrainFact|
|                  | <---- | (Lovable AI)      |       | functions        |
|  User answers    |       | Asks questions,   |       | tenants, FAQs,   |
|  in plain English|       | parses answers,   |       | services, hours, |
|                  |       | returns structured |       | policies, scripts|
+------------------+       | data + next Q     |       +------------------+
                            +-------------------+
```

### User Experience
1. User opens Business Brain and sees a "Set up with AI" button (or it appears for new tenants automatically)
2. A chat panel slides open (drawer on mobile, side panel on desktop)
3. The AI introduces itself: "I'm going to ask you about your business so your AI receptionist knows exactly how to handle calls. Let's start..."
4. It asks targeted questions in groups:
   - **Identity**: Business name, address, timezone, tagline, years in business
   - **Hours**: Days/hours of operation, holiday handling
   - **Services**: What you offer, pricing, packages
   - **Policies**: Deposits, cancellations, what the AI should never promise
   - **AI Personality**: How to greet callers, tone, escalation rules
   - **FAQs**: Common questions customers ask
5. After each group, the AI saves the answers to the database
6. When done, user sees their Brain completion jump to ~90%

### Key Design Decisions
- The AI uses the tenant's `business_mode` and `capabilities_json` to skip irrelevant questions (e.g., no impound questions for an auto body shop)
- Questions are conversational, not form-like: "What are your hours? Do you close for lunch?" rather than "Enter Monday open time"
- The AI can ask follow-up questions based on answers (e.g., "You mentioned you do paint jobs -- how long does a typical paint job take?")
- Answers are saved in batches (per topic group) so progress isn't lost if the user leaves mid-conversation
- The user can always go back to the manual editors to tweak anything

## Technical Details

### New Edge Function: `brain-builder-chat`
- Receives: tenant_id, business_mode, capabilities_json, conversation history, current topic
- Uses Lovable AI (google/gemini-2.5-flash) to conduct the interview
- System prompt tells the AI exactly which fields to extract and in what format
- Returns: AI's next message + any structured data extracted from the user's answers
- Structured data format matches the existing `writeBrainFact` function signatures

### New React Components

**`src/components/brain/builder/BrainBuilderChat.tsx`**
- Main chat interface component
- Renders message bubbles, input field, typing indicator
- Manages conversation state and topic progression
- Calls the edge function for each user message

**`src/components/brain/builder/BrainBuilderDrawer.tsx`**
- Wraps the chat in a Vaul drawer (mobile) or Dialog (desktop)
- "Set up with AI" trigger button shown in the Brain Hub header
- Shows progress through topics as a subtle step indicator

**`src/components/brain/builder/useBrainBuilder.ts`**
- Hook managing the conversation loop
- Sends messages to the edge function
- Receives structured data back and calls the appropriate `writeBrainFact` functions
- Tracks which topic groups are complete
- Invalidates React Query caches after writes so the Brain UI updates in real-time

### Topic Groups and Field Mapping
Each topic maps to specific `writeBrainFact` functions:

| Topic | Fields Written | writeBrainFact Function |
|-------|---------------|------------------------|
| Identity | name, tagline, address, timezone | `updateBusinessProfile()` |
| Hours | availability_slots | `upsertAvailabilitySlot()` |
| Services | services table entries | `createService()` |
| Policies | deposit_policy, cancellation_policy, never-promise | `updatePolicies()`, `upsertNeverPromise()` |
| AI Setup | greeting_script, fallback_script | `updateAIScripts()` |
| FAQs | business_faqs entries | `createFAQ()` |
| Intake | required questions | `upsertIntakeRequirement()` |

### Edge Function System Prompt Strategy
The system prompt will:
1. Receive the tenant's mode + capabilities as context
2. Have a structured topic list with required fields per topic
3. Ask conversational questions, then extract structured data
4. Return JSON with both the next chat message and any extracted fields
5. Skip topics that don't apply (e.g., skip Calendar for callback-only businesses)

### Integration Points
- **Brain Hub**: Add "Set up with AI" button next to the progress indicator
- **Guided Setup Overlay**: Add option "Let AI help me set up" alongside current step list
- **Completion tracking**: Reuses existing `useBrainCompletion` hook -- no changes needed since writes go through the same tables

### Files to Create
1. `supabase/functions/brain-builder-chat/index.ts` -- Edge function
2. `src/components/brain/builder/BrainBuilderChat.tsx` -- Chat UI
3. `src/components/brain/builder/BrainBuilderDrawer.tsx` -- Drawer wrapper
4. `src/components/brain/builder/useBrainBuilder.ts` -- Conversation logic hook
5. `src/components/brain/builder/types.ts` -- Shared types

### Files to Modify
1. `src/components/brain/hub/BusinessBrainHub.tsx` -- Add "Set up with AI" button
2. `src/components/brain/GuidedSetupOverlay.tsx` -- Add AI setup option

### No Database Changes Needed
All writes use existing tables through existing `writeBrainFact` functions.

