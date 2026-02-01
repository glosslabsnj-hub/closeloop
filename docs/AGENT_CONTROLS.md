# Agent Controls: Busyness & Safe OFF

This document describes the two new agent control features: **Busyness Slider** and **Safe Agent Toggle OFF**.

## Overview

These features give business owners fine-grained control over their AI agent's behavior while ensuring calls are never dropped.

### Goals
1. **Busyness Slider**: Adjust AI strictness based on current demand
2. **Safe OFF Toggle**: Configure what happens when agent is turned OFF (prevent dead rings)

---

## 1. Busyness Slider

### What It Does
A dashboard slider (0-100%) that tells the AI how busy the business is. The AI adjusts its behavior accordingly:

- **0-25% (Relaxed)**: Answer fast, be flexible, offer more options
- **26-70% (Normal)**: Balanced approach
- **71-100% (Packed)**: Stricter booking, prioritize callbacks, quote longer ETAs

### Where It Lives
- **Dashboard**: [DashboardHeroCard.tsx](../src/components/dashboard/DashboardHeroCard.tsx)
- Appears between agent status and metrics strip
- Always visible above the fold

### How It Works
1. User drags slider (0-100, step=5)
2. Debounced save (500ms) to `tenants.busyness_rules_jsonb.manual_busyness_pct`
3. Shows "Saving..." badge during save
4. Shows toast confirmation on success
5. AI receives `current_busyness_pct` in ElevenLabs dynamic variables

### Database Schema
```typescript
tenants.busyness_rules_jsonb: {
  base_prep_minutes: number;        // Base prep time (e.g., 30 min)
  busy_buffer_minutes: number;      // Extra buffer when busy (e.g., 15 min)
  manual_busyness_pct: number;      // 0-100, user-controlled
}
```

### Data Flow
```
User drags slider
  → handleBusynessChange()
  → debounce 500ms
  → saveBusynessLevel()
  → UPDATE tenants SET busyness_rules_jsonb = {...}
  → refreshTenant()
  → Toast: "Saved - Busyness level set to X%"
```

### Agent Integration
The busyness level is passed to ElevenLabs via `buildDynamicVariables()`:
```typescript
current_busyness_pct: ctx.pricing.busyness_config?.manual_busyness_pct || 0
```

The AI can reference this in its prompt and adjust behavior dynamically.

---

## 2. Safe Agent Toggle OFF

### The Problem
Before this feature, toggling the agent OFF simply hung up on callers with a generic message. If the business forwards their phone to Twilio, this meant **dead rings** when the agent was OFF.

### The Solution
A configuration modal that lets owners choose what happens when the agent is OFF:

1. **Forward to Owner** - Forward calls to business owner's phone
2. **Voicemail** - Play message and record voicemail
3. **Callback Only** - Capture caller info and promise callback

### Database Schema (Migration: `20260202000002_add_agent_off_behavior.sql`)

```sql
-- New enum type
CREATE TYPE public.off_behavior AS ENUM (
  'FORWARD_OWNER',
  'VOICEMAIL',
  'CALLBACK_ONLY'
);

-- New columns in assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN off_behavior public.off_behavior DEFAULT 'FORWARD_OWNER',
ADD COLUMN owner_forward_number TEXT,
ADD COLUMN owner_forward_verified BOOLEAN NOT NULL DEFAULT false;
```

### User Flow

#### First Time Toggling OFF
1. User clicks agent toggle to turn OFF
2. If `off_behavior = FORWARD_OWNER` AND `owner_forward_number` is missing:
   - Block the toggle
   - Show [AgentOffBehaviorModal](../src/components/dashboard/AgentOffBehaviorModal.tsx)
3. User selects behavior:
   - **Forward to Owner**: Enter phone number (validated to E.164)
   - **Voicemail**: No config needed
   - **Callback Only**: No config needed
4. Click "Save & Turn OFF"
5. Modal saves config, closes, and completes the toggle to OFF

#### Subsequent Toggles
If OFF behavior is already configured, the toggle works immediately with behavior-aware toast:
- "Paused - calls will forward to you"
- "Paused - calls go to voicemail"
- "Paused - capturing callback requests"

### Call Routing Logic ([twilio-inbound](../supabase/functions/twilio-inbound/index.ts))

When `voice_ai_enabled = false` OR `voice_mode = 'off'`:

```typescript
if (off_behavior === 'FORWARD_OWNER') {
  if (owner_forward_number && owner_forward_verified) {
    // TwiML: <Dial>owner_forward_number</Dial>
    // Fallback: If no answer, take voicemail
  } else {
    // Fallback to voicemail (no forward number configured)
  }
}

if (off_behavior === 'VOICEMAIL') {
  // TwiML: <Say>message</Say> + <Record>
}

if (off_behavior === 'CALLBACK_ONLY') {
  // TwiML: <Say>We'll call you back</Say>
  // Create lead in `leads` table with source='callback_request'
}
```

### Data Flow

**Dashboard Toggle:**
```
User toggles OFF
  → handleToggle(enabled=false)
  → Check off_behavior
  → If FORWARD_OWNER && !owner_forward_number:
      → Show AgentOffBehaviorModal
      → User configures
      → UPDATE assistant_settings SET off_behavior, owner_forward_number
  → Else:
      → UPDATE assistant_settings SET voice_ai_enabled=false
  → Toast with behavior-aware message
```

**Inbound Call:**
```
Twilio webhook → twilio-inbound
  → Fetch assistant_settings (includes off_behavior, owner_forward_number)
  → If voice_ai_enabled === false:
      → Route based on off_behavior
      → Return TwiML (Dial/Record/Say)
  → Else:
      → Proceed with AI agent flow
```

---

## Testing

### Manual Testing

**Busyness Slider:**
1. Open dashboard
2. Drag busyness slider to 25%
3. Verify toast: "Saved - Busyness level set to 25%"
4. Reload page - verify slider stays at 25%
5. Test agent in simulator - observe behavior differences at 25% vs 90%

**Safe OFF Toggle:**
1. Toggle agent to OFF
2. Verify modal appears (if first time or no forward number)
3. Select "Forward to my phone" and enter +15551234567
4. Click "Save & Turn OFF"
5. Verify toast: "Paused - calls will forward to you"
6. Make a test call to CloseLoop number
7. Verify it rings your phone

**OFF Routing:**
1. Configure off_behavior = VOICEMAIL
2. Toggle agent OFF
3. Call CloseLoop number
4. Verify voicemail message plays
5. Leave a voicemail
6. Check `ai_call_sessions` table for recording URL

### Automated Tests
See [agent-off-routing.test.ts](../tests/agent-off-routing.test.ts):
- OFF behavior validation
- Phone normalization
- Busyness clamping
- Toggle guard logic

---

## Files Changed

### Database
- `supabase/migrations/20260202000002_add_agent_off_behavior.sql` - Schema migration

### Components
- `src/components/dashboard/DashboardHeroCard.tsx` - Busyness slider + enhanced toggle
- `src/components/dashboard/AgentOffBehaviorModal.tsx` - OFF configuration modal (new)

### Edge Functions
- `supabase/functions/twilio-inbound/index.ts` - OFF routing logic
- `supabase/functions/_shared/buildBusinessContext.ts` - Already wires busyness_pct

### Tests
- `tests/agent-off-routing.test.ts` - Routing decision tests (new)

---

## Future Enhancements

### Busyness
- **Auto Mode**: Automatically adjust busyness based on:
  - Call volume (last hour)
  - Booking density (next 4 hours)
  - Day of week patterns
- **Schedule Overrides**: "Always 80% during lunch rush (11am-2pm)"

### OFF Behavior
- **Phone Number Verification**: Send SMS code to verify owner_forward_number
- **Multiple Forward Numbers**: Primary, secondary, tertiary fallback
- **Time-Based Routing**: Forward to different numbers based on time/day
- **Voicemail Transcription**: Auto-transcribe voicemails and send via SMS/email
- **Smart Routing**: Route to on-call person (integrate with calendar/schedule)

---

## Support & Troubleshooting

### Common Issues

**Busyness slider not saving:**
- Check browser console for errors
- Verify user has tenant.id
- Check `tenants.busyness_rules_jsonb` is not locked by RLS policies

**Calls still hang up when agent is OFF:**
- Verify migration `20260202000002_add_agent_off_behavior.sql` ran successfully
- Check `assistant_settings.off_behavior` is set (not null)
- Inspect Twilio logs for actual TwiML returned
- Check `twilio_event_logs` table for `stage='agent_off_routing'`

**Forward not working:**
- Verify `owner_forward_number` is in E.164 format (+1XXXXXXXXXX)
- Verify `owner_forward_verified = true`
- Check Twilio console for Dial verb errors
- Test forward number by calling it directly

**Modal not appearing:**
- Clear browser cache
- Check React DevTools - component should mount
- Verify `offBehaviorModalOpen` state is true
- Check console for React errors

---

## Architecture Decisions

### Why Busyness in tenants.busyness_rules_jsonb?
- Already existed (from pricing/ETA feature)
- Shared with existing `base_prep_minutes` and `busy_buffer_minutes`
- Single source of truth for all busyness-related config

### Why Modal for OFF Configuration?
- Prevents accidental dead rings (UX safeguard)
- Educates users about what OFF means
- Forces explicit choice (no hidden defaults)
- One-time setup, doesn't interrupt future toggles

### Why 3 OFF Behaviors (not more)?
- Covers 95% of use cases:
  - Small businesses: Forward to owner
  - After hours: Voicemail
  - High call volume: Callback queue
- Keeps UI simple (radio buttons, not complex forms)
- Can add more behaviors later without breaking existing config

### Why Debounce 500ms for Busyness?
- Prevents excessive DB writes while dragging
- 500ms feels instant to users
- Balances responsiveness vs write efficiency
- Can be tuned if needed (300-1000ms range)

---

## Monitoring

### Metrics to Track
- **Busyness Usage**: % of tenants who adjust slider daily
- **Busyness Distribution**: Histogram of typical levels (0-25, 26-70, 71-100)
- **OFF Behavior Adoption**: % using each behavior (FORWARD_OWNER, VOICEMAIL, CALLBACK_ONLY)
- **OFF Toggle Frequency**: How often agents are toggled per tenant
- **Failed Forwards**: Dial failures when using FORWARD_OWNER
- **Callback Conversion**: % of callback requests that turn into bookings

### Logs to Monitor
- `twilio_event_logs.stage = 'agent_off_routing'` - OFF routing events
- `ai_call_sessions` WHERE `voice_ai_enabled = false` - Calls while OFF
- `leads.source = 'callback_request'` - Callback requests captured

---

## Git Commits

1. `bf5b431` - Add agent OFF behavior database migration
2. `49731cd` - Add safe agent toggle OFF with behavior modal
3. `2c22e71` - Implement deterministic OFF routing in twilio-inbound
4. `ac9dfc7` - Add comprehensive tests for agent OFF routing

(Busyness slider was included in first commit)

---

## Related Docs
- [CLAUDE.md](../CLAUDE.md) - Non-negotiables (including Twilio inbound rules)
- [GOLDEN_PATH_TEST_REPORT.md](../GOLDEN_PATH_TEST_REPORT.md) - Golden path verification
- [GO_LIVE_CHECKLIST.md](../GO_LIVE_CHECKLIST.md) - Production readiness
