# Refactor Step 2: Service Area System

## Summary

Implemented an industry-flexible Service Area system in Business Brain that supports multiple coverage models: radius-based, county-based, ZIP code-based, and hybrid approaches. The system supports include/exclude logic where exclusions always override inclusions.

## JSON Structure

The `service_area_json` field on the `tenants` table stores the following structure:

```typescript
interface ServiceAreaConfig {
  mode: "radius" | "counties" | "zips" | "hybrid";
  base_address: {
    line1: string;
    city: string;
    state: string;      // 2-letter code (e.g., "IL")
    zip: string;
    lat: number | null; // For future geocoding
    lng: number | null;
  };
  radius_miles: number | null;
  include: {
    counties: Array<{ name: string; state: string }>;
    zips: string[];
    states: string[];   // 2-letter codes
  };
  exclude: {
    counties: Array<{ name: string; state: string }>;
    zips: string[];
    states: string[];
  };
  restrictions: {
    no_cross_state_lines: boolean;
  };
  notes: string;
}
```

### Coverage Modes

| Mode | Description |
|------|-------------|
| `radius` | Serve within X miles of base address |
| `counties` | Serve specific counties by name |
| `zips` | Serve specific ZIP codes |
| `hybrid` | Combine multiple criteria - location passes if ANY inclusion criterion is met |

### Exclusion Priority

Exclusions **always** override inclusions:
1. Check if location is in any exclusion list (state, ZIP, county)
2. If excluded, return false immediately
3. Check state line restriction if enabled
4. Then evaluate mode-specific inclusion rules

### State Line Restriction

When `restrictions.no_cross_state_lines` is `true`:
- Locations must be in the same state as `base_address.state`
- OR be in an explicitly included state in `include.states`

## Files Changed

### New Files
- `src/hooks/useServiceArea.ts` - React hook for loading/saving service area config, includes:
  - `useServiceArea()` - hook returning config, loading state, and save function
  - `isLocationServiceable(config, location)` - helper to check if a location is serviceable
  - `getServiceAreaSummary(config)` - generates plain English summary

### Modified Files
- `src/components/brain/ServiceAreaManager.tsx` - Complete rewrite with:
  - Coverage mode selector (Radius/Counties/ZIPs/Hybrid)
  - Base address form
  - Radius input (for radius/hybrid modes)
  - County include/exclude chip inputs
  - ZIP include/exclude chip inputs
  - State include/exclude chip inputs
  - "Do not cross state lines" toggle
  - Summary card showing current configuration
- `src/lib/brain/writeBrainFact.ts` - Updated `updateServiceArea()` to accept full config structure

## API Functions

### `useServiceArea()` Hook

```typescript
const {
  serviceArea,      // ServiceAreaConfig
  isLoading,        // boolean
  isSaving,         // boolean
  saveServiceArea   // (config: ServiceAreaConfig) => Promise<void>
} = useServiceArea();
```

### `isLocationServiceable(config, location)` Helper

```typescript
const isServiceable = isLocationServiceable(serviceArea, {
  state: "IL",           // Optional: 2-letter state code
  zip: "60601",          // Optional: ZIP code
  county: "Cook",        // Optional: County name
  countyState: "IL",     // Required if county is provided
  distanceMiles: 15,     // Optional: Distance from base (for radius mode)
});
```

### `getServiceAreaSummary(config)` Helper

Returns a plain English string describing the configuration:
```typescript
getServiceAreaSummary(config)
// => "Within 25 miles of Chicago | 3 exclusions | IL Only"
```

## Manual Testing

1. **Configure radius-based service area**
   - Navigate to Business Brain > Service Area section
   - Select "Radius from Base Address" mode
   - Enter base address (street, city, state, ZIP)
   - Enter radius in miles (e.g., 25)
   - Click "Save Service Area"
   - Verify the summary card shows "Within 25 miles of [city]"

2. **Add exclusions to override inclusions**
   - In the "Exclude" section, add a ZIP code or county
   - Save and verify the summary shows "Has Exclusions" badge
   - Note: Exclusions override any inclusion criteria

3. **Enable state line restriction**
   - Toggle "Do Not Cross State Lines" to ON
   - Verify the summary shows "[State] Only" badge
   - This restricts service to base state unless states are explicitly included

## Integration with AI

The service area configuration is available to the AI through the `buildBusinessContext` function. The AI can use this to:
- Inform callers if their location is outside the service area
- Route dispatch requests appropriately
- Provide accurate service availability information

## Notes

- The `service_area_json` column already existed in the `tenants` table, so no migration was needed
- The JSONB structure is flexible and backward-compatible with any existing data
- Lat/lng fields are included for future geocoding integration but are not currently used
- Calendar connection/integrations were not modified per requirements
