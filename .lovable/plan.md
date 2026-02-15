

# Automated A2P 10DLC SMS Registration Flow

## The Problem

Right now, when a business signs up and gets a Twilio number provisioned, that number can only handle **voice calls**. To send SMS (appointment confirmations, follow-ups, review requests), the number needs to be registered through Twilio's A2P 10DLC compliance system. This involves:

1. **Customer Profile** -- A trust bundle with the business's legal info
2. **Brand Registration** -- Registering the business as a "brand" with The Campaign Registry (TCR)  
3. **Campaign Registration** -- Declaring the SMS use case (e.g., "appointment reminders")
4. **Messaging Service** -- A Twilio container that links the number + campaign together

Currently none of these steps exist in the codebase, and `hasSmsFeature()` is hardcoded to `false`.

## What Data Is Needed (That We Don't Collect Yet)

Twilio's A2P 10DLC registration requires business identity data that the current onboarding does **not** capture:

| Required Field | Currently Collected? |
|---|---|
| Legal business name | No (we only have "business name") |
| EIN / Tax ID | No |
| Business entity type (LLC, Corp, etc.) | No |
| Business registration state | No |
| Business street address (structured) | Partial (free-text address field) |
| Contact person name | No (available via auth profile) |
| Contact email | No (available via auth email) |
| Contact phone | Yes (business phone) |
| Website URL | Yes (in BusinessIdentityForm, not always collected in onboarding) |
| Business vertical/industry | Yes (industry slug) |

## Architecture: The "ISV" Model

Since CloseLoop owns the Twilio account and provisions numbers on behalf of tenants, this follows Twilio's **ISV (Independent Software Vendor)** pattern. This means:

- CloseLoop has a **Primary Business Profile** (one-time, done in Twilio Console)
- Each tenant gets a **Secondary Customer Profile** created via API
- Each tenant gets a **Brand Registration** + **Campaign** created via API
- The provisioned number is added to a **Messaging Service** linked to the campaign

## Implementation Plan

### Phase 1: Collect Required Business Data

**Add fields to onboarding** -- Extend the "Your Business" step (Step 1) or the "Tell us a bit more" sub-section (`BusinessDetailsForm`) to capture:

- **Legal business name** (if different from display name)
- **EIN / Tax ID** (9-digit federal number)
- **Entity type** selector: Sole Proprietorship, LLC, Corporation, Partnership, Non-Profit
- **Registration state** (US state dropdown)
- **Structured address** fields: Street, City, State, ZIP (replace or supplement the free-text address)
- **Contact first/last name** (pre-fill from auth profile if available)

These fields will be stored in a new `sms_registration` JSON column on the `tenants` table (or a dedicated `a2p_registrations` table).

### Phase 2: Database Schema

Create an `a2p_registrations` table to track the multi-step registration status:

```text
a2p_registrations
-----------------
id                    UUID PK
tenant_id             UUID FK -> tenants
status                TEXT (pending_profile, pending_brand, pending_campaign, approved, failed)
customer_profile_sid  TEXT  -- Twilio CustomerProfile SID
brand_sid             TEXT  -- Twilio BrandRegistration SID  
campaign_sid          TEXT  -- Twilio Campaign SID
messaging_service_sid TEXT  -- Twilio MessagingService SID
legal_business_name   TEXT
ein                   TEXT (encrypted)
entity_type           TEXT
registration_state    TEXT
street_address        TEXT
city                  TEXT
state                 TEXT
zip_code              TEXT
contact_first_name    TEXT
contact_last_name     TEXT
contact_email         TEXT
contact_phone         TEXT
failure_reason        TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

RLS: tenant-scoped read/write.

### Phase 3: Edge Function -- `register-a2p-10dlc`

A single edge function that orchestrates the full Twilio A2P registration pipeline. Called automatically after number provisioning succeeds.

**Step-by-step API flow:**

1. **Create Secondary Customer Profile** (TrustHub API)
   - POST to `/v1/CustomerProfiles` with policy SID for A2P
   - Attach business info (name, EIN, address) as EndUserResources
   - Submit for evaluation

2. **Create Brand Registration**
   - POST to `/v1/a2p/BrandRegistrations` with the CustomerProfile SID
   - Poll/webhook for approval (takes minutes to hours)

3. **Create Messaging Service**
   - POST to `/v1/Services` (Messaging)
   - Add the provisioned phone number to the Messaging Service

4. **Create Campaign**
   - POST to `/v1/Services/{sid}/UsAppToPerson` with:
     - Brand SID
     - Use case: "MIXED" or "CUSTOMER_CARE" 
     - Sample messages (appointment confirmations, reminders)
     - Opt-in/opt-out description
   - Poll/webhook for approval (takes days)

5. **Update `a2p_registrations`** status at each step

### Phase 4: Integration Into Provisioning Flow

Modify `provision-twilio-number/index.ts`:
- After successful number purchase, automatically call `register-a2p-10dlc`
- Pass tenant business data from the `a2p_registrations` table

Modify `OnboardingPage.tsx`:
- After Twilio provisioning succeeds (line ~726), trigger A2P registration with the collected business data

### Phase 5: Status Tracking and Cron

**New edge function: `cron-a2p-status-check`**
- Runs every 30 minutes
- Polls Twilio for brand/campaign approval status
- Updates `a2p_registrations.status`
- When campaign is approved, enables SMS sending for that tenant

**Dashboard indicator:**
- Show SMS registration status on the dashboard/settings page
- States: "Registering...", "Pending Approval", "Approved -- SMS Active", "Failed (reason)"

### Phase 6: Enable SMS Feature Gate

Update `src/config/pricing.ts`:
- Change `hasSmsFeature()` to return `true` for tenants with approved A2P registration
- This unlocks SMS UI components (settings, templates, send controls)

## User Experience (What Businesses See)

1. **Onboarding Step 1**: They fill in business name, industry, and now also legal name, EIN, entity type, and address (presented as "we need this to activate your texting capabilities")
2. **Onboarding completes**: Phone number provisioned + A2P registration kicks off automatically in background
3. **Dashboard**: Shows "SMS: Setting up..." badge that updates to "SMS: Active" once approved (typically 1-3 business days)
4. **No manual Twilio interaction required** -- fully invisible to the business owner

## Technical Considerations

- **EIN sensitivity**: Store encrypted or in Twilio only (never log it). Consider using Twilio's TrustHub as the canonical store rather than keeping EIN in our database.
- **Sole Proprietors**: Businesses without an EIN use the Sole Proprietor registration path (lower throughput limits but simpler -- no EIN needed, uses phone OTP verification instead).
- **Fallback**: If A2P registration fails or is pending, SMS features remain disabled gracefully with a clear status message.
- **Pre-requisite**: CloseLoop must have an approved **Primary ISV Business Profile** in the Twilio Console before any of this works. This is a one-time manual step.

## File Changes Summary

| Action | File/Path |
|--------|-----------|
| Create | `supabase/functions/register-a2p-10dlc/index.ts` |
| Create | `supabase/functions/cron-a2p-status-check/index.ts` |
| Modify | `supabase/functions/provision-twilio-number/index.ts` -- trigger A2P after purchase |
| Modify | `supabase/config.toml` -- add new function configs |
| Create | DB migration for `a2p_registrations` table |
| Modify | `src/components/onboarding/BusinessDetailsForm.tsx` -- add legal/EIN/entity fields |
| Modify | `src/pages/app/OnboardingPage.tsx` -- pass new fields, trigger A2P |
| Modify | `src/config/pricing.ts` -- update `hasSmsFeature()` logic |
| Create | `src/components/dashboard/SmsRegistrationStatus.tsx` -- status indicator |

