
# Distance Basis Configuration for Dispatch Businesses

## Overview

You want dispatch businesses to be able to clearly configure how distance is measured for pricing - whether they charge based on the tow distance (pickup to dropoff), dispatch distance (base to pickup), or total trip. This configuration should be easy to understand and set at the business level as a default, with the option to override per-service.

---

## What Already Exists

Good news: most of the infrastructure is already in place.

1. **Per-Service Configuration**: The service editor already has a "Distance Measured From" dropdown with three options
2. **Edge Function Logic**: The `check-service-area` function already reads this setting and calculates prices using the correct distance
3. **Distance Calculation**: Both dispatch distance and tow distance are calculated in parallel for every call

---

## What Needs to Change

### 1. Remove the Legacy "Double-Count" Option

The `apply_per_mile_buffer` flag in `compute-distance-eta` was causing inflated ETAs by adding per-mile time on top of Mapbox's route duration (which already accounts for distance). This should be removed entirely since:
- It's confusing
- It was never intentional behavior
- It doesn't map to any real business need

**Changes:**
- Remove the `apply_per_mile_buffer` parameter from the request interface
- Remove all conditional logic that uses it
- Remove the `eta_per_mile_minutes` field from the ETA components debug output

---

### 2. Add Tenant-Level Default Distance Basis

Create a new setting in the Business Brain for dispatch businesses that sets the default distance measurement method. This will be stored in the `tenant_distance_settings` table.

**New field:** `default_distance_basis` with options:
- `tow_distance` - "Price based on tow distance (pickup to dropoff)" - Default for towing
- `dispatch_distance` - "Price based on how far we travel to you"
- `total_trip` - "Price based on entire round trip"
- `flat` - "Distance doesn't affect pricing"

---

### 3. New UI Section: "How You Charge for Distance"

Add a dedicated card in the Business Brain (under Dispatch Settings or as a new section) that clearly explains:

**Visual Layout:**
```text
+-----------------------------------------------+
|  How You Charge for Distance                  |
+-----------------------------------------------+
|  Most towing businesses charge based on how   |
|  far the vehicle needs to be towed.           |
|                                               |
|  [ ] Tow Distance (pickup → dropoff)          |
|      "We charge based on how far we tow the   |
|       vehicle to its destination"             |
|                                               |
|  [ ] Dispatch Distance (our shop → pickup)    |
|      "We charge based on how far we travel    |
|       to reach you"                           |
|                                               |
|  [ ] Total Trip (shop → pickup → dropoff)     |
|      "We charge for our entire round trip"    |
|                                               |
|  This becomes the default for new services.   |
|  You can override this per-service.           |
+-----------------------------------------------+
```

---

### 4. Per-Service Inheritance

Update the service editor to show when a service is using the tenant default vs. a custom override:

**Service Editor Changes:**
- Add "Use Business Default" option that's pre-selected for new services
- Show which distance basis the business default is set to
- Allow explicit override per-service
- Visual indicator when using default vs. custom

---

## Technical Implementation

### Database Changes

Add a new column to `tenant_distance_settings`:

```sql
ALTER TABLE tenant_distance_settings 
ADD COLUMN IF NOT EXISTS default_distance_basis TEXT 
DEFAULT 'tow_distance' 
CHECK (default_distance_basis IN ('tow_distance', 'dispatch_distance', 'total_trip', 'flat'));
```

### Edge Function Changes

**compute-distance-eta:**
- Remove `apply_per_mile_buffer` parameter and all related logic
- Remove `eta_per_mile_minutes` from the ETA components output
- Simplify the code to: `ETA = response_base + busyness_buffer + drive_time`

**check-service-area:**
- When resolving `distance_basis`, check service config first, then fall back to tenant default
- Add logging to show which distance basis was used and why

### Frontend Changes

**New Component: `DistanceBasisSettings.tsx`**
- Radio button group with clear explanations
- Located in Business Brain under a "Pricing & Distance" or "Dispatch Settings" section
- Saves to `tenant_distance_settings.default_distance_basis`

**Updated: `DispatchServiceEditor.tsx`**
- Add "Use Business Default" option to the distance basis dropdown
- Show the current default in the dropdown description
- Inherit from tenant default when creating new services

---

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/compute-distance-eta/index.ts` | Remove `apply_per_mile_buffer` logic |
| `supabase/functions/elevenlabs-check-service-area/index.ts` | Add tenant default fallback |
| `src/components/brain/dispatch/DistanceBasisSettings.tsx` | New component |
| `src/components/brain/dispatch/DispatchServiceEditor.tsx` | Add "use default" option |
| `src/hooks/useTenantDistanceSettings.ts` | Add `default_distance_basis` field |
| `src/pages/app/BusinessBrainPage.tsx` | Add new section |
| Database migration | Add column to `tenant_distance_settings` |

---

## User Experience Flow

1. **During Onboarding**: Ask "How do you typically charge for distance?" with clear examples
2. **In Business Brain**: Dedicated "Distance & Pricing" card shows current setting
3. **Per Service**: Shows "Using business default (Tow Distance)" or allows override
4. **During Calls**: AI uses the correct distance for pricing quotes

---

## Summary

This plan removes the confusing legacy double-counting logic and adds a clear, business-owner-friendly way to configure how distance affects pricing. The setting lives at the tenant level as a default (so you don't have to configure every service) but can be overridden per-service for businesses with mixed pricing models.
