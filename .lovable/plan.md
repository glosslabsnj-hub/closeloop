
# Voice Agent Flow Overhaul: Industry-Aware Service Agent

## Problem Summary

When you called the plumbing business (Blue Boxer Plumbing), the AI agent incorrectly behaved like a dispatch service:
1. Collected your address and name
2. Confirmed service area
3. Immediately offered "dispatch someone in 30-60 minutes"

**What should have happened** for a service/booking business:
1. Understand the service needed (drain cleaning)
2. Ask about urgency/timing preference
3. Check the calendar for availability
4. Offer appointment slots
5. Book the appointment (or mark as pending based on settings)

## Root Cause Analysis

The issue is in the **Service Agent base prompt** (`agentBasePrompts.ts`) which includes an "EMERGENCY/SAME-DAY FLOW" section that triggers immediate dispatch behavior. The agent is treating *every* service request as if it might be urgent, when most service businesses operate on an **appointment-first** model.

### Current Flow (Broken)
```text
Customer: "I need my drain cleaned"
Agent: "What's your address?"
Agent: "We can dispatch someone in 30-60 minutes"
```

### Expected Flow (Correct)
```text
Customer: "I need my drain cleaned"
Agent: "Is this an emergency, or can it wait for a scheduled appointment?"
  OR
Agent: "When would you like to schedule that?"
Agent: "Let me check our availability... We have openings at 2pm today or 10am tomorrow"
```

## Solution Design

### 1. Add New Tenant Setting: `service_default_flow`

Create a new field in `assistant_settings` to control the default behavior for service businesses:

| Value | Behavior |
|-------|----------|
| `schedule_first` | Always start with calendar availability (default for salons, auto detailing, cleaning) |
| `urgency_check` | Ask "Is this urgent or can it wait?" before deciding path (default for HVAC, plumbing, electrical) |
| `dispatch_first` | Immediate dispatch like a tow truck (not typical for service mode) |

**Industry defaults** (auto-set during onboarding):
- Salon/Spa/Barbershop → `schedule_first`
- Auto Detailing/Car Wash → `schedule_first`
- Cleaning/Maid Service → `schedule_first`
- HVAC/Heating/Cooling → `urgency_check`
- Plumbing → `urgency_check`
- Electrical → `urgency_check`
- Locksmith → `dispatch_first`
- General Service → `schedule_first`

### 2. Update Service Agent Base Prompt

Rewrite the Service Agent prompt to follow this decision tree:

```text
┌─────────────────────────────────────────────┐
│         Customer Calls Service Business      │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│     Identify Service Requested              │
│     "What can I help you with today?"       │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│     Check service_default_flow setting      │
└─────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    schedule_first       urgency_check        dispatch_first
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ "When works     │  │ "Is this urgent  │  │ "Where are you │
│  for you?"      │  │  or can it wait?"│  │  located?"     │
│ → Check calendar│  │                  │  │ → Dispatch NOW │
└─────────────────┘  └──────────────────┘  └────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        "It's urgent!"            "I can schedule"
              │                           │
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │ Check if same- │          │ Check calendar │
     │ day available  │          │ offer slots    │
     └────────────────┘          └────────────────┘
              │
     Has same-day slots?
         │          │
        Yes         No
         │          │
         ▼          ▼
     Book today   "I can have someone
                   call you back to
                   expedite, or we have
                   [next available]"
```

### 3. Dynamic Variable Injection

Add a new dynamic variable `service_default_flow` to the context builder so the ElevenLabs agent knows which flow to use.

### 4. Update the ElevenLabs Service Agent

The prompt in ElevenLabs must be updated to read the `service_default_flow` variable and adapt behavior accordingly. This is a configuration change in the ElevenLabs dashboard.

## Technical Implementation

### Database Migration

Add new column to `assistant_settings`:
- `service_default_flow`: enum (`schedule_first`, `urgency_check`, `dispatch_first`) DEFAULT `schedule_first`

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/new.sql` | Add `service_default_flow` column |
| `supabase/functions/_shared/buildBusinessContext.ts` | Include `service_default_flow` in context |
| `supabase/functions/_shared/voiceContextContract.ts` | Register new dynamic variable |
| `supabase/functions/_shared/agentBasePrompts.ts` | Rewrite SERVICE_AGENT_BASE_PROMPT with flow logic |
| `src/integrations/supabase/types.ts` | Auto-updated with new column |
| `src/components/brain/sections/AISetupSection.tsx` | Add UI toggle for "Service Call Behavior" |

### Prompt Changes (agentBasePrompts.ts)

Replace the current EMERGENCY/SAME-DAY FLOW section with a conditional flow:

```typescript
### DETERMINING THE CALL FLOW

At the start of every call, determine the appropriate flow based on the 
business setting (service_default_flow variable):

**IF service_default_flow = "schedule_first":**
- Skip urgency questions
- Immediately ask about scheduling: "When would work best for you?"
- Use suggest_availability and check_availability tools
- Book the appointment

**IF service_default_flow = "urgency_check":**
- After identifying the service, ask: "Is this something urgent, or can it wait for a scheduled appointment?"
- Listen for urgency indicators: "emergency", "right now", "today", "ASAP", "water everywhere", "no heat", "locked out"
- IF URGENT: Check for same-day availability first, then offer dispatch if enabled
- IF NOT URGENT: Proceed to scheduling flow

**IF service_default_flow = "dispatch_first":**
- Treat like dispatch mode: collect address, give ETA, dispatch immediately
- This is rare for service businesses

**IMPORTANT: DO NOT assume urgency.** A customer saying "I need my drain cleaned" 
is NOT automatically urgent. Only explicit urgency language triggers emergency flow.
```

### Business Brain UI Update

Add a new setting in the AI Setup section:

**Service Call Behavior** (only visible for service mode)
- "Schedule appointments by default" (schedule_first)
- "Ask if urgent or can be scheduled" (urgency_check)  
- "Immediate dispatch like a tow service" (dispatch_first)

## ElevenLabs Dashboard Changes Required

After code deployment, you'll need to update the Service Agent prompt in ElevenLabs to use the new `service_default_flow` variable. I'll provide the exact prompt text to copy/paste.

## Validation Checklist

After implementation:
1. Call Blue Boxer Plumbing and say "I need my drain cleaned"
2. Verify agent asks about scheduling (not immediate dispatch)
3. Verify agent checks calendar availability
4. Verify booking is created properly
5. Test urgent scenario: "My pipe burst, water everywhere!"
6. Verify urgent scenario triggers expedited handling

## Expected Behavior After Fix

**Scenario 1: Routine Service Request**
```text
Customer: "I need my drain cleaned"
Agent: "Sure, we can help with that. Is this something urgent, 
        or would you like to schedule an appointment?"
Customer: "I can schedule"
Agent: "Perfect. When works best for you - morning or afternoon?"
Customer: "Tomorrow afternoon"
Agent: "Let me check... I have 2pm or 4pm available. Which works better?"
```

**Scenario 2: Urgent Request**
```text
Customer: "I have water flooding my basement!"
Agent: "I understand - that sounds urgent. What's your address?"
Agent: "We can have someone there within the hour. Should I dispatch now?"
```

**Scenario 3: Salon (schedule_first - no urgency check)**
```text
Customer: "I need a haircut"
Agent: "Great! When would you like to come in?"
```
