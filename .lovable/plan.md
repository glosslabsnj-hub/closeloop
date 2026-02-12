

# Smart Service Intelligence: Complexity + Price Factors Across All Business Modes

## What This Solves

Right now, every service in the catalog is treated the same by the AI -- whether it's a simple oil change or a complex engine rebuild. The AI has no way to know:
- **What makes a price vary** (vehicle type? oil grade? location? party size?)
- **Whether to ask detailed questions** (a quick service vs. a diagnostic deep-dive)

This isn't just about Smiles Auto Works. A hair salon needs the AI to know that a "Balayage" is complex (hair length, color history) while a "Men's Cut" is straightforward. A towing company needs the AI to know a "Lockout" is simple but "Heavy Duty Tow" needs vehicle weight, location access, and clearance info.

## What Changes

### 1. Database: Add `complexity` and `price_factors` to `services`

Two new columns:
- `complexity` ("simple" or "complex") -- tells the AI whether to do a quick confirmation or a deep intake
- `price_factors` (text) -- tells the AI exactly what makes the price vary, in plain English

### 2. Service Catalog Editor: Two New Fields (All Business Modes)

**Complexity toggle** -- appears on every service:
- Label: "How should the AI handle this?"
- Options: "Quick confirmation" (simple) vs "Ask detailed questions first" (complex)
- Helper text adapts per mode:
  - Auto shop: "Quick: oil change, tire rotation. Detailed: engine diagnostics, electrical issues"
  - Salon: "Quick: men's cut, blowout. Detailed: balayage, color correction"
  - Towing: "Quick: lockout, jump start. Detailed: heavy-duty tow, accident recovery"
  - Medical: "Quick: follow-up visit. Detailed: initial consultation, procedure"
  - Food: Hidden (food items are always straightforward)

**Price factors field** -- appears when price type is "starting at" or "quote required":
- Label: "What makes the price vary?"
- Placeholder adapts per mode:
  - Auto: "e.g., Vehicle type, oil grade (conventional vs synthetic)"
  - Salon: "e.g., Hair length, color complexity, products used"
  - Towing: "e.g., Vehicle weight, distance, time of day"
  - Medical: "e.g., Treatment area, number of units, complexity"
  - General: "e.g., Project scope, materials, timeline"

### 3. Context Builder: Wire Into AI Prompt

Update `buildServicesForPrompt()` in `buildBusinessContext.ts` to include complexity tags and price factors:

```
Before:
  Oil Change: Starting at $45 (final price varies) [ON-SITE ONLY]

After:
  Oil Change: Starting at $45 (final price varies) [ON-SITE ONLY] [QUICK SERVICE]
    Price depends on: vehicle type and oil grade (conventional vs synthetic)
    Duration: 30 min

  General Auto Repair: Quote required [ON-SITE ONLY] [NEEDS DETAILS - ask about symptoms before quoting]
    Info needed: what's happening, how long, warning lights, drivability
    Duration: varies
```

The ElevenLabs agent prompt already instructs the AI to adapt based on context tags. Adding `[QUICK SERVICE]` vs `[NEEDS DETAILS]` gives it clear behavioral cues without any prompt changes needed.

### 4. Smart Defaults by Industry

When services already exist but lack these fields, provide sensible defaults based on service name patterns:
- Services with "repair", "diagnostic", "custom", "restoration" -> complex
- Services with "change", "wash", "cut", "checkup", "follow-up" -> simple
- "starting_at" or "quote_only" services without price_factors get auto-suggested text

This runs as a one-time data migration for existing tenants.

---

## Technical Details

### Database Migration

```sql
ALTER TABLE services
  ADD COLUMN complexity text NOT NULL DEFAULT 'simple',
  ADD COLUMN price_factors text DEFAULT NULL;

-- Validation trigger (not CHECK constraint per guidelines)
CREATE OR REPLACE FUNCTION validate_service_complexity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complexity NOT IN ('simple', 'complex') THEN
    RAISE EXCEPTION 'complexity must be simple or complex';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_service_complexity
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION validate_service_complexity();

-- Smart defaults for existing services
UPDATE services SET complexity = 'complex'
WHERE lower(name) ~* '(repair|diagnostic|custom|restoration|rebuild|overhaul|electrical|transmission|engine|collision|surgery|procedure|consultation|assessment|heavy.?duty|accident|recovery|color.?correction|balayage|perm)'
  AND complexity = 'simple';
```

### File: `src/components/brain/ServiceCatalogEditor.tsx`

Update `ServiceFormData`:
```typescript
interface ServiceFormData {
  // ... existing fields ...
  complexity: 'simple' | 'complex';
  price_factors: string;
}
```

Add to `ServiceForm` component (after the price type selector):

1. **Complexity toggle** (hidden for food mode):
   - Two-option toggle: "Quick confirmation" / "Ask detailed questions"
   - Industry-aware helper text from a new `COMPLEXITY_HINTS` map

2. **Price factors field** (shown when price_type is "starting_at" or "quote_only"):
   - Textarea with mode-specific placeholder from `PRICE_FACTOR_HINTS` map
   - Label: "What makes the price vary? (AI will explain this to callers)"

Update `handleSave` and `handleCreateNew` to include the new fields.

Update `toggleService` to initialize `complexity` and `price_factors` from existing service data.

### File: `src/lib/industryExamples.ts`

Add two new maps:

```typescript
export const COMPLEXITY_HINTS: Record<BusinessMode, { simple: string; complex: string }> = {
  service: { simple: "Oil change, tire rotation, basic wash", complex: "Engine diagnostic, electrical, transmission" },
  dispatch: { simple: "Lockout, jump start, tire change", complex: "Heavy-duty tow, accident recovery, winch-out" },
  food: { simple: "Standard menu items", complex: "Custom catering, special dietary prep" },
  medical: { simple: "Follow-up, routine checkup", complex: "Initial consultation, procedure, surgery" },
  general: { simple: "Standard service, quick task", complex: "Custom project, assessment needed" },
  sales: { simple: "Standard product inquiry", complex: "Custom configuration, financing discussion" },
};

export const PRICE_FACTOR_HINTS: Record<BusinessMode, string> = {
  service: "e.g., Vehicle type, material grade, job scope",
  dispatch: "e.g., Vehicle weight, distance, time of day, road conditions",
  food: "e.g., Portion size, add-ons, dietary substitutions",
  medical: "e.g., Treatment area, number of units, insurance",
  general: "e.g., Project scope, materials, timeline",
  sales: "e.g., Configuration, financing terms, add-on packages",
};
```

### File: `supabase/functions/_shared/buildBusinessContext.ts`

**Update `NormalizedService` interface** (line 39):
```typescript
export interface NormalizedService {
  // ... existing fields ...
  complexity: 'simple' | 'complex';
  price_factors: string;
}
```

**Update `normalizeServices()` (line ~1006):**
- Read `s.complexity` and `s.price_factors` from the DB row
- Default complexity to 'simple', price_factors to ''

**Update `buildServicesForPrompt()` (line 1156):**
- After the price text and dropoff tag, add complexity tag:
  ```typescript
  const complexityTag = s.complexity === 'complex'
    ? '[NEEDS DETAILS - ask about symptoms/specifics before quoting]'
    : '[QUICK SERVICE]';
  line += ` ${complexityTag}`;
  ```
- If `price_factors` is set, add: `\n  Price depends on: ${s.price_factors}`
- If complexity is 'complex' and description exists, add: `\n  Info: ${s.description}`

**Update the services query** to include the new columns (search for `SELECT` on services table in the context builder).

### File: `src/lib/brain/writeBrainFact.ts`

Update `createService` and `updateService` to accept and pass `complexity` and `price_factors`.

### Deployment

- Database migration (adds columns + smart defaults)
- Redeploy edge functions that import `buildBusinessContext.ts`: `twilio-inbound`, `get-business-context`, `elevenlabs-init` (or whichever imports the shared module)
- Frontend changes to service editor

