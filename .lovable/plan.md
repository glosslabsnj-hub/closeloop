
# Smart Dispatch: Service-Aware Dropoff + Distance Pricing Intelligence

## What This Solves

Right now, the AI asks for (or skips) the dropoff address the same way for every dispatch service. But in reality:
- **Towing** needs both pickup AND dropoff (where should the car go?)
- **Jump start, tire change, lockout** only need the customer's location -- there's no "dropoff"
- **Pricing** varies: a jump start might be $85 flat within 25 miles, but $85 + $3/mile beyond that

The AI needs to understand each service's requirements automatically, based on how the business sets it up.

## What Changes

### 1. Add "Requires Dropoff" Toggle to Each Service (Database + UI)

Each dispatch service gets a new `requires_dropoff` boolean field on the **services** table. This tells the AI whether to ask for a destination.

- **Towing presets** default to `requires_dropoff: true`
- **Roadside presets** (jump start, lockout, tire change, fuel delivery) default to `requires_dropoff: false`
- **Recovery/winch out** defaults to `false`

In the Service Editor, this appears as a simple toggle: **"This service requires a drop-off location"** with a helper like *"Turn this on for towing services where the vehicle goes somewhere else."*

### 2. Add "Distance Surcharge" to Flat-Rate Services (UI)

Flat-rate services (like jump start at $85) need an optional **"charge extra beyond X miles"** setting. This lives inside the existing pricing config:

- Toggle: **"Add distance surcharge beyond service area"**
- When enabled, two fields appear:
  - **Included miles**: e.g., 25 (miles included in the base price)
  - **Per-mile rate beyond**: e.g., $3/mile

This uses the existing `DispatchPricingConfig` structure -- we add an `overage_per_mile` and `included_miles` field so flat-rate services can have distance-based overages without switching to full distance-tiered pricing.

### 3. AI Learns Per-Service Rules Automatically

The `buildServicesForPrompt` function (which generates the text the AI reads) will include:
- Whether each service needs a dropoff address
- The pricing structure including distance overages

Example AI context output:
```text
- Jump Start: $85 flat rate (within 25 mi, +$3/mi beyond) [ON-SITE ONLY - no dropoff needed]
- Local Tow: $125 base (0-10 mi included), $5/mi after [REQUIRES DROPOFF - ask where to tow]
```

### 4. Update Dispatch Agent Prompt

The prompt changes from a blanket "ask for dropoff on towing" rule to a smarter, data-driven rule:

> "Check the service's requirements. If it says 'REQUIRES DROPOFF', you MUST ask where they want it taken. If it says 'ON-SITE ONLY', do NOT ask for a dropoff -- just confirm the pickup location."

### 5. Update the Tool Config

The `dropoff_address` parameter description becomes:
> "Where to take the vehicle/item. REQUIRED if the service requires a dropoff (towing). Do NOT ask for this on on-site services (jumpstart, lockout, tire change)."

---

## Technical Details

### Database Migration

Add `requires_dropoff` column to the `services` table:

```text
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS requires_dropoff boolean DEFAULT true;
```

Add `included_miles` and `overage_per_mile` to `DispatchPricingConfig` type (no DB change needed -- it's already JSONB in `pricing_config_json`).

### Files Modified

| File | Change |
|------|--------|
| `services` table (migration) | Add `requires_dropoff` boolean column |
| `src/types/dispatchPricing.ts` | Add `included_miles` and `overage_per_mile` to `DispatchPricingConfig`; add `requires_dropoff` to presets |
| `src/components/brain/dispatch/DispatchServiceEditor.tsx` | Add "Requires Dropoff" toggle; add distance surcharge fields for flat-rate pricing |
| `supabase/functions/_shared/buildBusinessContext.ts` | Update `buildServicesForPrompt()` to include dropoff requirement and overage pricing |
| `supabase/functions/_shared/agentBasePrompts.ts` | Replace hardcoded "ask for dropoff on towing" with data-driven rule |
| `supabase/functions/_shared/agentToolsConfig.ts` | Update `dropoff_address` description to reference service config |
| `supabase/functions/elevenlabs-create-dispatch-job/index.ts` | Calculate overage pricing when creating job |

### How Presets Change

| Service | requires_dropoff | Default Pricing |
|---------|-----------------|-----------------|
| Local Tow | true | Distance-tiered (existing) |
| Long Distance Tow | true | Distance-tiered (existing) |
| Heavy Duty Tow | true | Distance-tiered (existing) |
| Flatbed | true | Distance-tiered (existing) |
| Jump Start | false | $65 flat + optional overage |
| Lockout | false | $75 flat + optional overage |
| Tire Change | false | $85 flat + optional overage |
| Fuel Delivery | false | Variable (existing) |
| Winch Out | false | Variable (existing) |

### AI Context Output Example

After these changes, the AI will see service listings like:

```text
- Local Tow: Distance-tiered: 0-10 miles: $125 base, 10-25 miles: $125 base + $5/mile, Over 25 miles: $200 base + $4/mile [REQUIRES DROPOFF]
- Jump Start: $65 flat rate (25 mi included, $3/mi beyond) [ON-SITE ONLY]
- Lockout Service: $75 flat rate [ON-SITE ONLY]
```

The dispatch prompt then instructs: "Read the service tag. If REQUIRES DROPOFF, ask where they want it taken. If ON-SITE ONLY, skip the dropoff question entirely."
