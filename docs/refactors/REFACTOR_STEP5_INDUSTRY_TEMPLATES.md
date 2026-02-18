# Refactor Step 5: Industry Templates for Business Brain

## Summary

This step adds industry-specific templates that pre-populate Business Brain with smart defaults. When a business selects an industry, they get pre-configured services, FAQs, policies, objection handlers, and service area recommendations. Everything remains fully editable - these are starting templates, not locked rules.

## Supported Industries

| Industry Key | Name | Business Mode | Services | FAQs | Objections |
|-------------|------|---------------|----------|------|------------|
| `detailing` | Auto Detailing | service | 6 | 7 | 4 |
| `towing` | Towing & Roadside | dispatch | 7 | 8 | 5 |
| `food` | Restaurant / Food Service | food | 5 | 8 | 5 |
| `medical` | Medical / Med Spa | medical | 6 | 8 | 6 |
| `other` | Other Service Business | service | 4 | 4 | 4 |

## Architecture

```
src/lib/industryTemplates/
├── index.ts              # Public exports
├── types.ts              # TypeScript interfaces
├── templates.ts          # Template definitions
└── templateApplication.ts # Preview & apply logic

src/components/brain/
├── IndustryTemplateCard.tsx   # Industry selector UI
└── ApplyTemplateModal.tsx     # Preview & apply modal
```

## Apply Modes

### Merge Mode (Default, Recommended)

- **Non-destructive**: Only adds new items, never overwrites existing data
- **Conflict handling**: Items that already exist are sent to Review Queue
- **Service area**: Only configured if not already set up

### Replace Mode

- **Full overwrite**: Deletes all existing services, FAQs, objections, and policies
- **Clean slate**: Applies entire template fresh
- **Warning shown**: User must acknowledge data loss

## Merge Rules

| Data Type | Conflict Detection | Merge Behavior |
|-----------|-------------------|----------------|
| Services | Name match (case-insensitive) | Skip existing, add new to Review Queue |
| FAQs | Fuzzy question match (~80% similar) | Skip existing, add new to Review Queue |
| Objections | Fuzzy objection match | Skip existing, add new to Review Queue |
| Policies | Type match (cancellation/deposit/refund) | Skip if already configured |
| Service Area | Check if already configured | Skip if has radius/zips/counties |

## Data Structures

### IndustryTemplate

```typescript
interface IndustryTemplate {
  industry_key: string;
  name: string;
  icon: string;
  business_mode: "service" | "dispatch" | "food" | "medical";
  defaults: {
    services: ServiceTemplateItem[];
    required_questions: RequiredQuestionItem[];
    policies: PolicyItem[];
    faqs: FAQItem[];
    objections: ObjectionItem[];
    service_area_defaults: ServiceAreaDefaults;
    scheduling_defaults: SchedulingDefaults;
  };
}
```

### ServiceTemplateItem

```typescript
interface ServiceTemplateItem {
  name: string;
  description?: string;
  base_price_model: "fixed" | "starting_at" | "quote_only";
  starting_price_cents?: number;
  fixed_price_cents?: number;
  duration_minutes: number;
  tags?: string[];
  deposit_required?: boolean;
  deposit_amount_cents?: number;
}
```

### RequiredQuestionItem

```typescript
interface RequiredQuestionItem {
  intent: "booking" | "dispatch" | "order" | "reservation" | "callback";
  service_name?: string; // Optional - if provided, question is service-scoped
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
  required: boolean;
}
```

## API Reference

### `getTemplate(industryKey)`

Get a template by industry key (supports fuzzy matching).

```typescript
import { getTemplate } from "@/lib/industryTemplates";

const template = getTemplate("detailing");
// Also matches: "auto detailing", "detail", "car detailing"
```

### `previewTemplateApplication(currentState, template, mode)`

Preview what will change before applying.

```typescript
import {
  previewTemplateApplication,
  fetchCurrentBrainState
} from "@/lib/industryTemplates";

const currentState = await fetchCurrentBrainState(tenantId);
const preview = previewTemplateApplication(currentState, template, "merge");

console.log(preview.totals);
// { itemsToAdd: 15, conflictCount: 3 }
```

### `applyTemplate(tenantId, template, mode, preview)`

Apply the template to Business Brain.

```typescript
import { applyTemplate } from "@/lib/industryTemplates";

const result = await applyTemplate(tenantId, template, "merge", preview);

console.log(result);
// {
//   success: true,
//   servicesAdded: 6,
//   faqsAdded: 5,
//   objectionsAdded: 4,
//   policiesUpdated: true,
//   serviceAreaUpdated: true,
//   conflictsCreated: 3,
//   errors: []
// }
```

## UI Components

### IndustryTemplateCard

Shows in Business Brain → Profile section. Features:
- Displays current industry if set
- Industry selector dropdown
- Template preview (counts of services, FAQs, etc.)
- "Apply Industry Template" button

### ApplyTemplateModal

Modal for previewing and applying templates. Features:
- Mode toggle (Merge / Replace)
- Replace mode warning
- Tabbed preview (Services, FAQs, Objections, Policies, Area)
- Items to add shown in green
- Conflicts shown in amber
- Apply button with loading state

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/industryTemplates/index.ts` | Public exports |
| `src/lib/industryTemplates/types.ts` | TypeScript interfaces |
| `src/lib/industryTemplates/templates.ts` | Template definitions |
| `src/lib/industryTemplates/templateApplication.ts` | Preview & apply logic |
| `src/components/brain/IndustryTemplateCard.tsx` | Industry selector UI |
| `src/components/brain/ApplyTemplateModal.tsx` | Preview & apply modal |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/app/BusinessBrainPage.tsx` | Added IndustryTemplateCard to Profile section |

## How to Test

1. **Apply Merge Template**
   - Go to Business Brain → Business Profile
   - Select an industry (e.g., "Auto Detailing")
   - Click "Apply Industry Template"
   - Verify preview shows correct counts
   - Click "Apply Template"
   - Check that services, FAQs, objections were added

2. **Test Conflict Detection**
   - First apply a template
   - Try to apply the same template again
   - Verify conflicts are detected and shown in amber
   - Verify conflicts go to Review Queue

3. **Test Replace Mode**
   - Add some custom services and FAQs
   - Apply a template in Replace mode
   - Verify warning is shown
   - Confirm and verify old data was replaced

4. **Verify Review Queue Integration**
   - Apply template with conflicts
   - Go to Review Queue
   - Verify template conflicts appear with source="template"
   - Accept or reject conflicts

5. **Test Industry Mapping**
   - Select different industries
   - Verify correct template loads
   - Verify business_mode is updated on tenant

## Template Content Summary

### Detailing

- **Services**: Basic Wash, Interior Detail, Exterior Detail, Full Detail, Ceramic Coating, Paint Correction
- **Questions**: Vehicle type, vehicle condition, preferred date, service location
- **Service Area**: 25-mile radius (mobile service)

### Towing

- **Services**: Local Tow, Long Distance Tow, Jump Start, Tire Change, Fuel Delivery, Lockout Service, Winch Out
- **Questions**: Pickup address, dropoff address, vehicle type, vehicle condition, estimated miles
- **Service Area**: 50-mile radius, no crossing state lines

### Food/Restaurant

- **Services**: Dine-In, Takeout, Delivery, Catering (Small), Catering (Large)
- **Questions**: Order type, delivery address, party size, reservation date/time
- **Service Area**: 5-mile radius (delivery)

### Medical/Med Spa

- **Services**: Initial Consultation, Follow-Up Visit, Botox, Dermal Fillers, Chemical Peel, Laser Treatment
- **Questions**: New patient status, treatment interest, insurance info, medical history
- **Service Area**: No restrictions (patients come to office)

## Architecture Notes

- **Templates are code-defined**: Stored in `templates.ts`, not database
- **Prices in cents**: All prices stored as integers (e.g., 5000 = $50.00)
- **Conflicts use Review Queue**: Reuses Step 3 infrastructure for conflict resolution
- **Industry field updated**: Applying template also updates `tenant.industry`
- **Business mode updated**: Sets `tenant.business_mode` based on template
