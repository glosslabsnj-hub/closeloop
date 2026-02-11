

# Streamline Business Brain for Callback-Only Service Businesses

## The Problem
When you're running a callback-only auto repair shop (no direct booking, just lead capture), the Business Brain still shows sections that don't apply -- like Calendar & Availability, Service Scheduling, Arrival Estimates, Booking Delivery, and Service Packages. The filtering system exists but isn't strict enough for your setup.

## What Changes

### Sections that will be HIDDEN for your auto repair shop
These will only appear when the relevant capability is turned on:

| Section | Why Hidden |
|---------|-----------|
| Calendar & Availability | `aiBooksDirect` is false -- no booking, no calendar needed |
| Service Scheduling | Only relevant when booking is enabled |
| Arrival Estimates | No on-site dispatch; you're a shop |
| Where to Send New Bookings | No booking module enabled |
| Service Packages | `offersPackages` is false |
| How Busy Are You Right Now? | Only useful for dispatch or walk-in-heavy shops with booking |

### Sections that STAY (relevant for lead qualification)
| Section | Why Relevant |
|---------|-------------|
| Your Service Area | Helps AI know if caller is local |
| Cancellation, Deposits & Payments | Deposit policy matters for repairs |
| What Your AI Should Never Promise | Critical for any business |
| Info to Collect on Every Call | Core to lead qualification |
| Other Rules for Your AI | Custom policies always useful |
| Callback Request Alerts | This IS the primary action |

### How It Works
The filtering uses your tenant's `capabilities_json` (which already has `aiBooksDirect: false`, `offersPackages: false`, `hasMultipleStaff: false`, etc.) to hide irrelevant items. No new capabilities needed -- just tighter visibility rules on existing items.

## Technical Details

### File: `src/config/brainSectionRegistry.ts`
Add `isVisible` guards to items that currently show universally but shouldn't:

- **`service-coverage`** (Service Scheduling): Already guarded by `mode === "service"` but needs additional `caps.isSchedulingBusiness` check
- **`travel-times`** (Arrival Estimates): Add guard for dispatch or mobile-service businesses only
- **`workload`** (How Busy): Add guard requiring dispatch or booking capability
- **`service-packages`** in Services tab: Already uses `isRelevant("service-packages")` -- verify the relevance rule checks `offersPackages`
- **`booking-delivery`**: Already guarded by `flags.showBookingDelivery` which checks `caps.isSchedulingBusiness` -- confirm this works

### File: `src/config/brainSectionRelevance.ts`
Verify/tighten relevance rules:
- `service-packages` rule should check `capabilities_json.offersPackages`
- `price-modifiers` rule should check if any modifier capability is true

### File: `src/config/brainSectionRegistry.ts` (Operations items)
- `calendar-sync` in Business tab: Already guarded by `caps.isSchedulingBusiness` -- good
- `service-coverage`: Tighten to `mode === "service" && caps.isSchedulingBusiness`
- `travel-times`: Add `mode !== "food"` AND (`caps.isDispatchBusiness` OR `caps.offersMobileService` check)
- `workload`: Add visibility guard for dispatch/booking businesses only

### No database changes needed
All filtering uses existing `capabilities_json` data already on your tenant.

