

# Fix: ElevenLabs Webhook Not Calling Backend

## Problem Identified

After test calls, the call log shows incomplete data:
- **Customer name**: Missing
- **Service requested**: Missing  
- **AI summary**: Missing

**Root cause**: ElevenLabs is not sending the post-call webhook to your backend. The webhook endpoint exists and works correctly, but **ElevenLabs has not been configured to call it**.

Evidence from the database:
- Zero `webhook_received` events logged (ever)
- All recent calls have `summary: null`, `outcome: null`, `extracted_payload: null`
- The `elevenlabs-webhook` edge function has no execution logs

---

## What Needs to Happen

The ElevenLabs agent must be configured to send a webhook when conversations end. This is done in the **ElevenLabs dashboard** (not in code).

### Step 1: Configure the Webhook in ElevenLabs

1. Go to the ElevenLabs dashboard
2. Navigate to your Conversational AI agent settings
3. Find the **Webhooks** or **Post-Call Webhook** section
4. Add this URL:
   ```
   https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-webhook
   ```
5. Enable the webhook for `conversation.ended` events
6. Save the configuration

### Step 2: Verify the Agent Configuration

Ensure the agent is configured to:
- Extract customer name (variable: `customer_name`)
- Extract service requested (variable: `service_requested`)
- Generate call summaries
- Track call success/outcome

---

## Technical Details

### The Webhook Flow (How It Should Work)

```text
CURRENT (BROKEN):
┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ twilio-      │───>│ ElevenLabs  │───>│ Call ends   │
│ inbound      │    │ handles     │    │ (NO WEBHOOK)│
└──────────────┘    │ call        │    └─────────────┘
                    └─────────────┘           ↓
                                         Data never
                                         reaches DB

EXPECTED (WORKING):
┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ twilio-      │───>│ ElevenLabs  │───>│ Call ends   │
│ inbound      │    │ handles     │    │             │
└──────────────┘    │ call        │    └─────────────┘
                    └─────────────┘           │
                                              ▼
                                    ┌─────────────────┐
                                    │ elevenlabs-     │
                                    │ webhook         │
                                    │ (POST callback) │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ ai_call_sessions│
                                    │ updated with:   │
                                    │ - summary       │
                                    │ - customer_name │
                                    │ - outcome       │
                                    └─────────────────┘
```

### What the Webhook Receives

When properly configured, ElevenLabs sends a POST request with:

```json
{
  "type": "conversation.ended",
  "conversation_id": "conv_xxx",
  "transcript": [
    { "role": "user", "message": "I need to book an appointment" },
    { "role": "agent", "message": "I'd be happy to help..." }
  ],
  "analysis": {
    "summary": "Customer called to book an interior detail...",
    "data_collection": {
      "customer_name": "John Smith",
      "service_requested": "Interior Detail"
    },
    "call_successful": true
  },
  "dynamic_variables": {
    "tenant_id": "...",
    "caller_phone": "..."
  }
}
```

### What the Backend Does (Already Implemented)

The `elevenlabs-webhook` edge function:
1. Matches the call by `conversation_id`
2. Extracts customer name, service, and outcome
3. Resolves/creates customer record
4. Updates `ai_call_sessions` with summary and extracted data
5. Logs stages: `webhook_received`, `summary_saved`, `extraction_saved`, `customer_resolved`

---

## Code Changes (Minimal)

### 1. Add Realtime Subscription to CallsPage

Currently, the Calls page requires manual refresh. I'll add a realtime subscription so updates appear instantly when the webhook processes data.

**File**: `src/pages/app/CallsPage.tsx`

```typescript
// Add realtime subscription for instant updates
useEffect(() => {
  if (!tenant?.id) return;
  
  const channel = supabase
    .channel('calls-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
      () => queryClient.invalidateQueries({ queryKey: ['ai_call_sessions', tenant.id] })
    )
    .subscribe();
  
  return () => { supabase.removeChannel(channel); };
}, [tenant?.id, queryClient]);
```

### 2. Enable Realtime on ai_call_sessions Table

**Database migration**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_call_sessions;
```

---

## Verification Steps

After configuring the webhook in ElevenLabs:

1. Make a test call
2. Have a brief conversation mentioning your name and what service you want
3. End the call
4. Within 10-30 seconds, the Calls page should update with:
   - Your name in the "Customer Name" column
   - The service in "Service Requested"
   - An AI-generated summary
   - A status like "Lead" or "Booked"

5. Check `ai_event_logs` for these stages:
   - `webhook_received`
   - `summary_saved`
   - `customer_resolved`

---

## Summary

| Issue | Fix |
|-------|-----|
| Webhook not configured | Configure in ElevenLabs dashboard |
| No realtime updates | Add Supabase realtime subscription |
| Data not appearing | Will work once webhook is configured |

**Important**: The webhook URL configuration is external to this codebase. You'll need to access the ElevenLabs dashboard to add the webhook endpoint.

