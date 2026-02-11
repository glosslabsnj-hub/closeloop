
# Clarify How Service Area, Distance Basis, and Pricing Tiers Connect

## The Problem

Right now, a dispatch business owner encounters three separate settings in different parts of the Business Brain that all deal with "distance" but never explain how they relate:

1. **Service Area** (Coverage section) -- "We serve within 30 miles"
2. **Distance Basis** (Coverage section) -- "We price based on tow distance"
3. **Distance Tiers** (inside each service) -- "0-10 miles = $125, 10-25 miles = $125 + $5/mi"

The owner has no way to know: do the "miles" in my pricing tiers refer to the same 30-mile radius I set up? Or something else? If I set a 30-mile service area and my tiers only go up to 25 miles, what happens at 28 miles? If distance basis is "tow distance" but my service area is based on distance from my shop, are those the same miles?

## The Solution

Add contextual cross-references and inline explanations that connect these three concepts wherever they appear, without moving or restructuring any settings.

### Change 1: Service Editor -- Show which miles the tiers use

In the distance-tiered pricing section of `DispatchServiceEditor.tsx`, add a clear callout that tells the owner exactly what "miles" means for their tiers:

- Pull the tenant's default `distance_basis` from `useTenantDistanceSettings`
- Show a banner above the tiers: **"These tiers use [Tow Distance] miles (pickup to dropoff). You can change this in Coverage & ETA."**
- If the service overrides the default, show that instead
- Link the service area radius inline: **"Your service area is 30 miles from base. Tiers beyond that distance apply to out-of-area jobs (if you accept them)."**

### Change 2: Service Editor -- Auto-suggest tier coverage

When the owner's highest tier doesn't cover up to their service area radius, show a gentle suggestion:

- "Your service area covers up to 30 miles, but your highest tier only goes to 25 miles. Jobs between 25-30 miles won't have a price -- the AI will need to ask for a custom quote."
- Offer a one-click "Add a tier for 25-30 miles" button

When the owner has tiers beyond their service area radius:
- "Your last tier covers 25+ miles, but your service area is only 30 miles. The AI will check service area first -- if someone is 40 miles away, they'll be told you don't serve that area before pricing comes up."

### Change 3: Distance Basis Settings -- Clarify the pricing connection

In `DistanceBasisSettings.tsx`, add a note that connects this setting to service pricing:

- "This setting determines which distance your per-mile rates in each service use. For example, if you choose 'Tow Distance' and a service charges $5/mile, that $5 applies to each mile the vehicle is towed (pickup to dropoff), not the distance from your shop."

### Change 4: Service Area Editor -- Reference pricing tiers

In the service area section, add a brief note:
- "This defines WHERE you'll accept jobs. Pricing for each service is configured separately under Services. The AI checks this area first -- if a caller is outside it, they're told you don't cover that location."

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/brain/dispatch/DispatchServiceEditor.tsx` | Import `useTenantDistanceSettings` and `useServiceArea`. Show distance basis label above tiers. Show service area alignment note. Add auto-suggest for missing tier coverage. |
| `src/components/brain/dispatch/DistanceBasisSettings.tsx` | Add a brief note explaining how this setting connects to per-service pricing tiers |
| `src/components/brain/ServiceAreaEditor.tsx` (or equivalent) | Add a brief note explaining that service area is about WHERE, not how much |

### Data Sources (already available, no new queries)

- `useTenantDistanceSettings()` -- provides `default_distance_basis`
- `useServiceArea()` -- provides `radius_miles` and `mode`
- Both hooks are already used elsewhere in the Brain and can be imported into the service editor

### No Database Changes

All changes are frontend copy/UX only. The underlying data model is correct -- the problem is entirely that the UI doesn't explain how the pieces connect.

### No Edge Function Changes

The backend already handles distance basis, service area checks, and tiered pricing correctly. This is purely about making the configuration UI self-explanatory.
