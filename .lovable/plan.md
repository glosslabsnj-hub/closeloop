

# Fix Plan: ElevenLabs Webhook Event Type & Data Structure

## Summary

Two issues have been identified:

1. **Webhook not processing call data** - ElevenLabs sends `post_call_transcription` events, but our webhook only processes `conversation.ended` or similar event types
2. **Phone calls missing context** - Possible mismatch in how dynamic variables are delivered between browser simulator (WebSocket SDK) and real phone calls (register-call API)

---

## Technical Analysis

### Webhook Event Type Mismatch

**Current behavior:**
```
Logs show: "Ignoring non-ended event type: post_call_transcription"
```

**Per ElevenLabs documentation:**
- Transcription webhook type is always `post_call_transcription`
- Data structure has `type`, `data`, and `event_timestamp` at top level
- Transcript, analysis, and metadata are inside `data` object

**Current code checks (lines 392-397):**
```typescript
const isConversationEnded = 
  eventType === "conversation.ended" || 
  eventType === "conversation_ended" ||
  eventType === "call.ended" ||
  eventType === "session.ended";
```

This misses `post_call_transcription` entirely.

### Data Structure Mismatch

**ElevenLabs new format:**
```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "...",
    "transcript": [...],
    "analysis": {...},
    "metadata": {...}
  },
  "event_timestamp": 1234567890
}
```

**Current code expects:**
```json
{
  "type": "conversation.ended",
  "conversation_id": "...",
  "transcript": [...],
  "analysis": {...}
}
```

---

## Implementation Plan

### Step 1: Update Event Type Detection

Modify the webhook to accept `post_call_transcription` as a valid event type to process:

```typescript
const isConversationEnded = 
  eventType === "post_call_transcription" ||  // ADD THIS
  eventType === "conversation.ended" || 
  eventType === "conversation_ended" ||
  eventType === "call.ended" ||
  eventType === "session.ended";
```

### Step 2: Update Payload Parsing

Handle the new data structure where fields are nested inside `data`:

```typescript
// Check if data is nested in 'data' object (new format)
const dataObject = parsedPayload.data as Record<string, unknown> | undefined;

const payload: ElevenLabsWebhookPayload = {
  type: eventType,
  conversation_id: conversationId,
  agent_id: ...,
  transcript: dataObject?.transcript ?? parsedPayload.transcript,
  analysis: dataObject?.analysis ?? parsedPayload.analysis,
  metadata: dataObject?.metadata ?? parsedPayload.metadata,
  dynamic_variables: dataObject?.conversation_initiation_client_data?.dynamic_variables ?? ...
};
```

### Step 3: Deploy & Verify

1. Deploy updated `elevenlabs-webhook` function
2. Make a new test call (browser simulator or phone)
3. Verify logs show "processing" instead of "ignoring"
4. Check `ai_call_sessions` table for populated `summary` and `transcript`

---

## Phone vs Simulator Context Issue

The second issue (pricing not working on phone) requires deeper investigation after the webhook fix. Both paths use `buildBusinessContext()` identically, but:

- **Browser**: SDK receives `dynamicVariables` directly
- **Phone**: Variables passed via `conversation_initiation_client_data.dynamic_variables` in register-call

If this persists after webhook fix, we need to verify the ElevenLabs agent prompt template uses `{{variable_name}}` syntax correctly.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/elevenlabs-webhook/index.ts` | Add `post_call_transcription` to event types, update data parsing |

---

## Testing Checklist

After deployment:
- [ ] Simulator call ends and transcript/summary appear in Calls tab
- [ ] Real phone call ends and transcript/summary appear in Calls tab
- [ ] Logs show "HMAC verified" then "processing" (not "ignoring")
- [ ] Customer resolution works (name extracted, customer linked)

