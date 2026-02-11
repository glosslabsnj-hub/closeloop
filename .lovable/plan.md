

# Skip Twilio Provisioning for Super Admin Test Tenants

## Problem
Every time you create a test tenant as a super admin, it provisions a new Twilio number (costing money and cluttering your account). You just want test tenants to use the universal admin test line (+1-855-329-7357) that already routes based on your active tenant selection.

## Solution
Add an `isSuperAdmin` check at every Twilio provisioning call site. If the current user is a super admin, skip provisioning entirely -- those tenants use the shared test line instead.

## Changes (3 files)

### 1. `src/pages/app/OnboardingPage.tsx` (line ~81, ~484-515)
- Destructure `isSuperAdmin` from `useAuth()` alongside `user, tenant, loading`
- Wrap the Twilio provisioning block (step 8) with `if (shouldProvision && !isSuperAdmin)` -- super admins skip provisioning, log "skipped: admin-test-tenant"

### 2. `src/hooks/useSubscription.ts` (line ~182-200)
- Accept an optional `isSuperAdmin` parameter (or add it as a new argument)
- Wrap the `provision-twilio-number` invoke with `if (!isSuperAdmin)` check
- Log: "Skipping Twilio provisioning for admin test tenant"

### 3. Other provisioning call sites (safety)
- `PhoneConnectionStep.tsx`, `ConnectPhoneDialog.tsx`, `PhoneNumberCard.tsx`, `MultiLocationManager.tsx` -- these are manual "Connect Phone" buttons in the dashboard, so they should still work for admins who explicitly click them. No changes needed there since those are intentional user actions, not automatic provisioning.

## No database changes needed
The admin test line routing already works via `twilio-inbound` looking up `admin_settings.admin_active_tenant_id`. This change just prevents automatic number provisioning during onboarding/subscription creation for admin users.
