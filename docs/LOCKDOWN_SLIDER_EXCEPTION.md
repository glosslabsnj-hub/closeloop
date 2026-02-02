# Business Brain Lockdown Rule + Slider Exception

## NON-NEGOTIABLE RULE

**Business Brain (`/app/business-brain`) is the ONLY place where business knowledge can be edited.**

All other pages in the application MUST be read-only for business knowledge, with "Edit in Business Brain" CTAs
that link users to the appropriate Business Brain section.

## What is Business Knowledge?

Business knowledge includes all data that trains/configures the AI assistant:

| Table | Examples |
|-------|----------|
| `services` | Service names, prices, durations |
| `business_faqs` | FAQ questions and answers |
| `objection_responses` | Objection handling scripts |
| `ai_knowledge_base` | Policies, procedures, guides |
| `business_intent_rules` | Required questions, pricing rules, upsell rules |
| `menu_items` | Food menu items (food mode) |
| `availability_slots` | Scheduling availability |
| `knowledge_sources` | Uploaded documents |
| `tenants` (subset) | Business profile, hours, policies, service area |

## The Exception: Business Mode & Industry Slider

### Allowed Fields

The homepage slider (or any mode switcher UI) may ONLY write these two fields:

1. **`business_mode`** - service | dispatch | food | medical | general
2. **`industry`** (industry_key) - Industry identifier for template defaults

### Allowed Methods

All slider writes MUST go through these centralized functions in `src/lib/brain/writeBrainFact.ts`:

```typescript
import {
  setBusinessMode,
  setIndustryKey,
  setBusinessModeAndIndustry,
} from "@/lib/brain/writeBrainFact";

// Change business mode only
await setBusinessMode(tenantId, "food");

// Change industry only
await setIndustryKey(tenantId, "pizza_restaurant");

// Change both atomically
await setBusinessModeAndIndustry(tenantId, "food", "pizza_restaurant");
```

### What the Slider MUST NOT Do

The slider is explicitly prohibited from writing:

- Services, pricing rules, or menu items
- FAQs or objection responses
- Policies or required questions
- Service area configuration
- Knowledge uploads or suggestions
- Availability slots
- Any other business knowledge

### Template Application

Applying industry templates (which populates services, FAQs, etc.) is NOT a slider operation.
Template application happens in Business Brain via:

- `IndustryTemplateCard` component
- `ApplyTemplateModal` component
- `applyTemplate()` function from `@/lib/industryTemplates`

The slider sets the industry KEY only. Template application is a separate, explicit action
that happens within Business Brain.

## Implementation Notes

### For Dashboard/Homepage Developers

If adding a mode switcher to the dashboard:

```tsx
import { setBusinessModeAndIndustry } from "@/lib/brain/writeBrainFact";

const handleModeChange = async (mode: BusinessMode, industry: string) => {
  await setBusinessModeAndIndustry(tenant.id, mode, industry);
  await refreshTenant();
  toast.success("Mode updated");
};
```

Do NOT call supabase directly. Do NOT write to any other tables.

### For Other Pages

All other pages should:

1. READ business knowledge from hooks/context
2. Display "Edit in Business Brain" buttons/links
3. Navigate to `/app/business-brain#section` for edits

Example read-only pattern:

```tsx
// READ only - display in UI
const { services } = useBusinessContext();

// Link to Business Brain for editing
<Button onClick={() => navigate("/app/business-brain#services")}>
  Edit in Business Brain
</Button>
```

### AdminModeSwitcher (Super-Admin Only)

The `AdminModeSwitcher` component in `src/components/admin/AdminModeSwitcher.tsx` is an exception
because it:

1. Only renders for `isSuperAdmin` users
2. Is explicitly for testing/demo purposes
3. Resets ALL test data (services, FAQs, calls, etc.) intentionally

This is acceptable because:
- It's super-admin only (not accessible to regular users)
- It's a testing tool, not a production feature
- Regular users never see this component

## Audit Trail

All slider writes are logged with `_source: "slider_exception"` in the audit log
to distinguish them from Business Brain writes.

## Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           Business Brain Page           │
                    │         /app/business-brain             │
                    │                                         │
                    │  ┌─────────┐ ┌─────────┐ ┌───────────┐ │
                    │  │Services │ │  FAQs   │ │ Policies  │ │
                    │  └────┬────┘ └────┬────┘ └─────┬─────┘ │
                    │       │           │            │        │
                    └───────┼───────────┼────────────┼────────┘
                            │           │            │
                            ▼           ▼            ▼
                    ┌─────────────────────────────────────────┐
                    │        writeBrainFact.ts                │
                    │   (Single Source of Truth for Writes)   │
                    │                                         │
                    │  createService()  createFAQ()           │
                    │  updateService()  updateFAQ()           │
                    │  updatePolicies() ...                   │
                    │                                         │
                    │  ─────────────────────────────────────  │
                    │  SLIDER EXCEPTION METHODS:              │
                    │  setBusinessMode()                      │
                    │  setIndustryKey()                       │
                    │  setBusinessModeAndIndustry()           │
                    └────────────────────┬────────────────────┘
                                         │
                            ┌────────────┴────────────┐
                            │                         │
                            ▼                         ▼
                    ┌───────────────┐         ┌───────────────┐
                    │   Dashboard   │         │  Other Pages  │
                    │ Mode Slider   │         │  (Read-Only)  │
                    └───────────────┘         └───────────────┘
                            │
                            ▼
                    Only calls:
                    - setBusinessMode()
                    - setIndustryKey()
                    - setBusinessModeAndIndustry()
```

## Related Documentation

- [Business Brain Overview](./REFACTOR_BUSINESS_BRAIN.md)
- [Industry Templates](./REFACTOR_STEP5_INDUSTRY_TEMPLATES.md)
- [Quote Engine](./REFACTOR_STEP4_QUOTE_ENGINE.md)
