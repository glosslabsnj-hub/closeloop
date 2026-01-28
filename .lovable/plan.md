

# Twilio Phone Number Provisioning Integration

## Overview

This implementation will integrate Twilio with your platform so that when a new customer pays (subscribes), they are automatically assigned a unique Twilio phone number from your account. Customers can then forward their business calls to this assigned number.

## Current Architecture

- **Subscription Flow**: When a user completes onboarding, a subscription is created in the `subscriptions` table with status `trialing`
- **Phone Setup**: Currently uses mock numbers generated from tenant ID hash
- **Database Fields**: `assistant_settings` already has `closeloop_number` field for storing the assigned number
- **Edge Functions**: `test-call-phone` exists as a placeholder for Twilio integration

## Implementation Plan

### Step 1: Add Twilio Secrets

Add the following secrets to Lovable Cloud:
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token

### Step 2: Create Edge Function for Phone Provisioning

Create a new edge function `provision-twilio-number` that:

1. Receives a `tenant_id` and optional area code preference
2. Searches for available Twilio phone numbers (local or toll-free)
3. Purchases/provisions the number via Twilio API
4. Configures the number's webhook URLs for voice/SMS handling
5. Returns the provisioned number

```text
+-------------------+     +------------------------+     +-------------+
|  Subscription     | --> | provision-twilio-number| --> |   Twilio    |
|  Created/Paid     |     |    Edge Function       |     |    API      |
+-------------------+     +------------------------+     +-------------+
         |                          |                          |
         |                          v                          |
         |                 +------------------+                 |
         |                 | assistant_settings|<---------------+
         |                 | closeloop_number  |     Phone Number
         +-----------------+------------------+
```

### Step 3: Integrate with Subscription Flow

Modify the subscription creation process to automatically trigger phone provisioning:

**Option A: Database Trigger (Recommended)**
- Create a database trigger on `subscriptions` table
- When status changes to `active` (after payment), call the edge function

**Option B: Application-Level Integration**
- Call the provisioning edge function after successful payment/subscription activation
- Update `OnboardingPage.tsx` to trigger provisioning after subscription creation

### Step 4: Update Phone Connection UI

Update `PhoneConnectionStep.tsx` to:
- Show "Provisioning your number..." state when waiting for Twilio
- Display the real Twilio number once provisioned
- Remove mock number generation

### Step 5: Track Provisioned Numbers

Add database fields to track Twilio metadata:
- `twilio_phone_sid` - The Twilio Phone Number SID for management
- `twilio_provisioned_at` - Timestamp of provisioning

---

## Technical Details

### Edge Function: `provision-twilio-number`

```text
Request Body:
{
  "tenant_id": "uuid",
  "area_code": "optional - preferred area code",
  "number_type": "local" | "toll_free"
}

Response:
{
  "success": true,
  "phone_number": "+1234567890",
  "phone_sid": "PN...",
  "friendly_name": "(234) 567-8901"
}
```

The function will:
1. Validate the tenant exists and has an active subscription
2. Check if tenant already has a number assigned (prevent duplicates)
3. Search Twilio for available numbers matching criteria
4. Purchase the first available number
5. Configure webhooks (voice URL, SMS URL) to point to your handlers
6. Update `assistant_settings.closeloop_number` with the new number
7. Return the provisioned number details

### Database Migration

Add tracking columns to `assistant_settings`:

```sql
ALTER TABLE assistant_settings 
ADD COLUMN twilio_phone_sid TEXT,
ADD COLUMN twilio_provisioned_at TIMESTAMPTZ;
```

### Webhook Configuration

When provisioning, set these webhooks on the Twilio number:
- **Voice URL**: Points to your inbound call handler edge function
- **SMS URL**: Points to your inbound SMS handler edge function
- **Status Callback**: For delivery receipts and call status updates

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/provision-twilio-number/index.ts` | Create | Main provisioning logic |
| `src/pages/app/OnboardingPage.tsx` | Modify | Trigger provisioning after payment |
| `src/components/dashboard/PhoneConnectionStep.tsx` | Modify | Show real Twilio number, loading state |
| `src/components/dashboard/ConnectPhoneDialog.tsx` | Modify | Use real provisioning instead of mock |
| Database migration | Create | Add `twilio_phone_sid`, `twilio_provisioned_at` columns |

---

## Security Considerations

1. **Service Role Only**: The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to update database
2. **Tenant Validation**: Verify tenant has active subscription before provisioning
3. **Idempotency**: Check if number already assigned to prevent duplicate purchases
4. **Rate Limiting**: Add protection against rapid provisioning attempts
5. **Secrets**: Twilio credentials stored securely in Lovable Cloud secrets

---

## Cost Notes

- Twilio local numbers: ~$1.15/month per number
- Twilio toll-free numbers: ~$2.00/month per number
- Per-minute voice costs apply for inbound/outbound calls
- Numbers are charged to your Twilio account automatically

---

## Rollout Steps

1. Add Twilio secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
2. Run database migration for new columns
3. Deploy the `provision-twilio-number` edge function
4. Update the frontend components
5. Test with a new trial signup
6. Verify the number appears and calls can be forwarded

