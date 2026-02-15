

# Instant SMS via Platform Shared Sender

## Problem

Every new business that signs up has to wait for toll-free verification (minutes to days) before any SMS can be sent. This means no booking confirmations, no reminders, no follow-ups during the most critical onboarding window.

## Solution: Platform-Level Pre-Verified Number

CloseLoop owns **one pre-verified toll-free number** that is already verified and ready to send. All new tenants send through this shared number until their own dedicated number is verified. The business name is prepended to every message so recipients know who it's from.

Example message a customer would receive:

> "Blue Boxer Plumbing: Your appointment is confirmed for tomorrow at 2:00 PM. Reply STOP to opt out."

Once the tenant's own toll-free number passes verification, the system automatically switches to it -- no action needed from the business owner.

```text
SMS Routing Priority (Updated)
===============================

1. Tenant has approved 10DLC        --> Send via 10DLC Messaging Service
2. Tenant has verified toll-free    --> Send via tenant's toll-free number
3. Tenant pending verification      --> Send via PLATFORM shared number (NEW)
4. Nothing available                --> Skip (should never happen now)
```

## What You Need To Do (One-Time Setup)

Before I implement the code, you'll need to provide:

- A **pre-verified toll-free number** from your Twilio account (the one you already have, or I can help you pick/verify one)
- Two environment secrets to store:
  - `PLATFORM_TF_PHONE_E164` -- the shared toll-free number (e.g. `+18886185650`)
  - `PLATFORM_TF_MESSAGING_SERVICE_SID` -- its Messaging Service SID

If the number `+18886185650` (already purchased) gets its verification approved, we can use that one as the platform number.

## Technical Changes

### 1. `supabase/functions/_shared/sms-sender.ts`

Add a third fallback tier to `sendTenantSms()`:

- After checking tenant's 10DLC and toll-free, check for `PLATFORM_TF_PHONE_E164` / `PLATFORM_TF_MESSAGING_SERVICE_SID` env vars
- When using the platform number, automatically prepend the tenant's business name to the message body (fetched from `tenants.name`)
- Return `channel: "platform_shared"` so callers know which path was used

### 2. `supabase/functions/send-sms/index.ts`

- Update the `skipped` handling -- with the platform fallback, messages should almost never be skipped
- Add `"platform_shared"` to the channel type in the response

### 3. `supabase/functions/booking-handoff/index.ts`, `cron-appointment-reminders/index.ts`, `cron-review-requests/index.ts`

- No changes needed -- they already use `sendTenantSms()`, so they inherit the platform fallback automatically

### 4. `src/components/dashboard/SmsRegistrationStatus.tsx`

- Add a status for "platform_shared": show "SMS: Active (Shared)" with a tooltip explaining messages are sending via the platform number while the dedicated number is being verified

### 5. `src/components/settings/SmsSettingsSection.tsx`

- Show an info banner when using the platform sender: "Your messages are being sent while your dedicated number is verified. Your business name is included in each message."

### 6. Environment Secrets

Two new secrets need to be configured:
- `PLATFORM_TF_PHONE_E164`
- `PLATFORM_TF_MESSAGING_SERVICE_SID`

### No Database Changes Needed

Everything fits within the existing `a2p_registrations` table and environment variables. No migrations required.

## Result

Every business can send SMS **immediately** after signing up. The transition from shared number to dedicated number is automatic and invisible to the business owner.

