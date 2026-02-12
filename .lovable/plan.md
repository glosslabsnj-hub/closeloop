

# Fix: Missing Database Columns + Call Disconnect

## Root Cause Analysis

### Why data isn't saving (bookings, leads, pipeline)
The edge function logs show two critical database errors on EVERY call:

```
ERROR [persistBooking] Could not find the 'duration_minutes' column of 'bookings'
ERROR [ensureLead] Could not find the 'customer_id' column of 'leads'
```

The `elevenlabs-webhook` code tries to insert `duration_minutes` into `bookings` and `customer_id` into `leads`, but those columns don't exist in the database. This means:
- Bookings silently fail to create
- Leads silently fail to create
- Test drives never get created (they depend on bookings)
- Sales pipeline shows nothing (depends on leads)

### Why calls may disconnect immediately
Most likely cause: the Custom Tools just added in ElevenLabs have a configuration issue (wrong URL format, missing parameter, or incorrect value type). The call connects to ElevenLabs, but when the agent tries to use a tool and it fails, it disconnects.

---

## Fix Plan

### Step 1: Add missing database columns

Add `duration_minutes` to `bookings` and `customer_id` to `leads`:

```sql
-- Add duration_minutes to bookings (code writes this on every booking)
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- Add price_cents to bookings (also referenced in code)
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS price_cents INT;

-- Add price_breakdown to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS price_breakdown JSONB;

-- Add customer_id to leads (code writes this on every lead)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
```

This is the critical fix -- once these columns exist, bookings AND leads will start saving successfully, which flows into test drives and the sales pipeline.

### Step 2: Verify the Custom Tools configuration in ElevenLabs

The immediate disconnect is likely from a misconfigured tool. After the DB fix, I'll provide a checklist to verify each tool is set up correctly:

- **URL format**: Must be the full URL with no trailing slash
- **Method**: POST for all tools
- **Content-Type**: application/json
- **Parameters**: tenant_id and conversation_id must be "Dynamic Variable" type, all others "LLM Prompt"

### Step 3: Deploy and test

After the DB migration, do a test call. The logs should now show successful booking and lead creation instead of PGRST204 errors.

---

## Technical Details

### Columns being added

| Table | Column | Type | Why |
|-------|--------|------|-----|
| `bookings` | `duration_minutes` | INT | Stores appointment length |
| `bookings` | `price_cents` | INT | Stores computed price |
| `bookings` | `price_breakdown` | JSONB | Stores pricing details |
| `leads` | `customer_id` | UUID (FK) | Links lead to customer record |

### What happens after fix
1. Call comes in -> twilio-inbound -> ElevenLabs conversation (already works)
2. Call ends -> elevenlabs-webhook processes conversation (already works)
3. Webhook creates customer record (already works)
4. Webhook creates lead with customer_id (WILL NOW WORK)
5. Webhook creates booking with duration_minutes (WILL NOW WORK)
6. Webhook creates test_drive linked to booking (WILL NOW WORK)
7. Dashboard shows data in test drives, pipeline, and appointments (WILL NOW WORK)

