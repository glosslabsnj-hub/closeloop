
# Dashboard & Voice Agent Improvements

## Overview
This plan addresses three key issues:
1. The dashboard shows one generic agent instead of separate Voice and SMS agents
2. The voice selector shows hardcoded voices instead of voices from your ElevenLabs agent
3. The AI literally says "business name" instead of your actual business name

---

## What You'll Get

### 1. Unified Agent Control Card with Voice & SMS Tabs
A single card on the dashboard that shows both agents (if you have both), with tabs to switch between them:
- **Voice Agent Tab**: Toggle on/off, phone number display, connection status, test button
- **SMS Agent Tab**: Toggle on/off, delay setting (how many seconds before auto-reply)
- Users with only one plan see only that agent (no tabs)

### 2. Simplified Voice Selection
Instead of 8 hardcoded voices, the Voice & Tone settings page will show a cleaner interface:
- Remove the voice picker entirely (since voices are managed in ElevenLabs)
- Keep tone/personality selector
- Keep greeting and fallback script editors

### 3. Fixed Business Name in AI Conversations
The AI will correctly say "Elite Auto Detailing" instead of "business name" in both:
- Browser-based test calls
- Real phone calls

---

## Technical Details

### Dashboard Agent Control Card

**Current behavior**: Single "AI Agent" card with generic toggle

**New behavior**: 
- Detect subscription type from `subscription.plan_code` (text, voice, or both)
- If "both": Show tabbed interface with Voice Agent and SMS Agent sections
- If "voice" only: Show just Voice Agent controls
- If "text" only: Show just SMS Agent controls

**Voice Agent section includes**:
- On/off toggle (controls `go_live_enabled` + `voice_ai_enabled`)
- Phone number display with copy button
- Connection status badge
- Quick "Test AI" button

**SMS Agent section includes**:
- On/off toggle (controls `instant_text_enabled`)
- Delay slider (0-60 seconds, controls `sms_first_delay_seconds`)
- Status indicator

### Voice Selector Changes

**Current behavior**: VoiceSelector.tsx shows 8 hardcoded ElevenLabs voice options

**New behavior**: 
- Remove the VoiceSelector component from the AI Assistant page
- Keep only ToneSelector for personality configuration
- Voice is managed directly in your ElevenLabs agent configuration

### Business Name Fix

**Root cause**: 
- For browser tests: The `elevenlabs-conversation-token` function gets a token without passing any business context
- The ElevenLabs agent has a variable `{{business_name}}` in its prompt, but when no value is provided, it falls back to the literal text

**Solution for browser tests**:
1. Update `elevenlabs-conversation-token` to accept `tenantId`
2. Fetch tenant name from database
3. Use the ElevenLabs conversation API with `overrides` to inject the business name dynamically

**Solution for phone calls**:
1. The `twilio-inbound` function already passes `business_name` in `dynamic_variables`
2. Verify the ElevenLabs agent prompt uses `{{business_name}}` syntax correctly
3. If needed, ensure the agent is configured to use dynamic variables

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/AgentControlCard.tsx` | Rewrite with tabbed Voice/SMS agents based on subscription |
| `src/pages/app/AIAssistantPage.tsx` | Remove VoiceSelector, simplify to tone + scripts only |
| `src/components/ai/VoiceSelector.tsx` | Delete this file |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Add business context injection for browser tests |
| `src/components/ai/VoiceAgentTest.tsx` | Pass tenant context when starting conversation |

---

## Testing Checklist
After implementation:
1. Test dashboard with "both" plan - verify two tabs appear
2. Test dashboard with "voice" only - verify no tabs, just voice controls
3. Test dashboard with "text" only - verify no tabs, just SMS controls
4. Test browser voice call - verify AI says actual business name
5. Test real phone call - verify AI says actual business name
6. Verify SMS delay slider saves correctly

