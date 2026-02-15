

# Toll-Free SMS Fallback + Server-Side A2P Automation

## Problem Summary

Two issues need solving:

1. **SMS is blocked during 10DLC approval** (1-3 business days). Tenants with pending A2P registration cannot send any SMS -- no confirmations, no reminders, no review requests.
2. **A2P registration is triggered from the client** (OnboardingPage.tsx line 782-803), which is fragile. If the browser closes or the request fails silently, the tenant never gets registered.

Additionally, all current SMS-sending paths (`send-sms`, `booking-handoff`, `cron-appointment-reminders`, `cron-review-requests`) send directly via the Twilio account rather than through the tenant's Messaging Service -- which will cause delivery failures once 10DLC campaigns are active (carriers require messages to route through the registered Messaging Service).

## Solution Architecture

```text
Number Provisioning Flow (Updated)
===================================

provision-twilio-number
  |
  +-- Purchase LOCAL number (voice + future 10DLC SMS)
  +-- Purchase TOLL-FREE number (immediate SMS fallback)
  +-- Call register-a2p-10dlc (server-side, not client)
  +-- Start toll-free verification
  |
  v
a2p_registrations table
  |-- toll_free_phone_e164    (new)
  |-- toll_free_phone_sid     (new)
  |-- toll_free_verified      (new)
  |-- toll_free_messaging_sid (new)
  |
  v
SMS Sending (Updated)
  |-- If A2P approved -> send via 10DLC Messaging Service
  |-- Else if toll-free verified -> send via toll-free Messaging Service
  |-- Else -> skip SMS (not yet ready)
```

## Changes

### 1. Database Migration

Add toll-free tracking columns to `a2p_registrations`:

- `toll_free_phone_e164` TEXT -- The toll-free number
- `toll_free_phone_sid` TEXT -- Twilio SID for the toll-free number
- `toll_free_verified` BOOLEAN DEFAULT false
- `toll_free_messaging_service_sid` TEXT -- Messaging Service for toll-free
- `toll_free_verification_sid` TEXT -- Twilio TF verification SID

### 2. Update `provision-twilio-number/index.ts`

After purchasing the local number (existing logic), add:

- Purchase a toll-free number for the same tenant
- Create a Messaging Service for the toll-free number
- Submit toll-free verification (Twilio's TF verification is typically approved in minutes, not days)
- Store toll-free SIDs in `a2p_registrations`
- Call `register-a2p-10dlc` server-side (removing the need for client-side trigger)

This makes the entire flow atomic -- one function call provisions voice + SMS.

### 3. Update `cron-a2p-status-check/index.ts`

Add toll-free verification status polling:

- Check `TollfreeVerifications` API for tenants with `toll_free_verified = false`
- When verified, set `toll_free_verified = true`
- Continue checking 10DLC status as before

### 4. Create shared SMS sending helper

Create `supabase/functions/_shared/sms-sender.ts` with a `sendTenantSms()` function that:

1. Checks `a2p_registrations` for the tenant
2. If `status = 'approved'` -- sends via the 10DLC Messaging Service SID
3. Else if `toll_free_verified = true` -- sends via toll-free Messaging Service SID
4. Else -- returns `{ skipped: true, reason: "no_verified_channel" }`

This replaces the raw Twilio API calls scattered across 4+ edge functions.

### 5. Update all SMS-sending functions

Refactor these to use the shared `sendTenantSms()` helper:

- `send-sms/index.ts`
- `booking-handoff/index.ts` (customer confirmation section)
- `cron-appointment-reminders/index.ts`
- `cron-review-requests/index.ts`

This ensures every SMS path automatically uses the correct channel (toll-free or 10DLC).

### 6. Remove client-side A2P trigger from OnboardingPage

Remove lines 781-803 in `OnboardingPage.tsx` (the `register-a2p-10dlc` invocation). The server now handles this inside `provision-twilio-number`.

### 7. Update `SmsRegistrationStatus.tsx`

Add a new status state for toll-free:

- `toll_free_active`: "SMS: Active (Toll-Free)" -- shows when toll-free is verified but 10DLC is still pending
- Update tooltip to explain: "Sending via toll-free while full registration completes"

### 8. Update `SmsSettingsSection.tsx`

Show which channel is currently active:

- Badge showing "Sending via Toll-Free" or "Sending via 10DLC" based on registration state
- Info callout explaining that toll-free is temporary and 10DLC will take over once approved

## Technical Details

### Toll-Free Verification API (Twilio)

Toll-free verification is simpler than 10DLC:
- POST to `/v2/RegulatoryCompliance/TollfreeVerifications`
- Requires: business name, address, use case description, sample messages, opt-in description
- Approval is typically minutes to hours (vs days for 10DLC)
- Lower throughput than 10DLC but sufficient for appointment SMS

### Messaging Service routing

When sending via a Messaging Service, the `From` parameter changes:
- Instead of `From: +1234567890`
- Use `MessagingServiceSid: MGxxxxxxxx`
- Twilio automatically selects the right number from the service

### Cost consideration

Each tenant gets 2 numbers during the transition period:
- Local number: voice calls + future 10DLC SMS
- Toll-free number: immediate SMS until 10DLC approved

Once 10DLC is approved, the toll-free number can optionally be released (future optimization).

## File Changes Summary

| Action | File |
|--------|------|
| Migrate | Add toll-free columns to `a2p_registrations` |
| Create | `supabase/functions/_shared/sms-sender.ts` |
| Modify | `supabase/functions/provision-twilio-number/index.ts` |
| Modify | `supabase/functions/register-a2p-10dlc/index.ts` (minor) |
| Modify | `supabase/functions/cron-a2p-status-check/index.ts` |
| Modify | `supabase/functions/send-sms/index.ts` |
| Modify | `supabase/functions/booking-handoff/index.ts` |
| Modify | `supabase/functions/cron-appointment-reminders/index.ts` |
| Modify | `supabase/functions/cron-review-requests/index.ts` |
| Modify | `src/pages/app/OnboardingPage.tsx` (remove client A2P trigger) |
| Modify | `src/components/dashboard/SmsRegistrationStatus.tsx` |
| Modify | `src/components/settings/SmsSettingsSection.tsx` |

