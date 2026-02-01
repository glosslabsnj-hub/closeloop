# Refactor Step 1: Service-Scoped Pricing Rules

## Summary

Added support for service-scoped pricing rules in Business Brain. Users can now create pricing rules (surcharges, discounts, fees) that apply globally to all services OR are scoped to a specific service.

## Files Changed

### New Files
- `supabase/migrations/20260201000001_add_pricing_rules_json.sql` - Migration to add `pricing_rules_json` column to tenants table
- `src/hooks/usePricingRules.ts` - React hook for CRUD operations on pricing rules
- `src/components/knowledge/PricingRulesEditor.tsx` - UI component for managing pricing rules

### Modified Files
- `src/integrations/supabase/types.ts` - Added `pricing_rules_json` field to tenants table types (Row, Insert, Update)
- `src/pages/app/BusinessBrainPage.tsx` - Added "Service & Pricing" tab with PricingRulesEditor

## Data Model

Each pricing rule stored in `pricing_rules_json` has the following structure:

```typescript
interface PricingRule {
  id: string;                              // UUID
  name: string;                            // e.g., "Weekend Surcharge"
  description: string;                     // e.g., "Applied to weekend appointments"
  type: "surcharge" | "discount" | "fee";  // Rule type
  amount: number;                          // Amount value
  amount_type: "percent" | "fixed";        // Whether amount is % or $
  service_id: string | null;               // null = global, uuid = service-scoped
  is_active: boolean;                      // Active/inactive toggle
  created_at: string;                      // ISO timestamp
  updated_at: string;                      // ISO timestamp
}
```

## API Functions

The `usePricingRules` hook exposes:

- `addRule(rule)` - Create a new pricing rule
- `updateRule(id, updates)` - Update an existing rule
- `deleteRule(id)` - Delete a rule
- `toggleRuleActive(id, is_active)` - Toggle rule active state
- `getApplicablePricingRules(serviceId?)` - Get global rules + rules scoped to serviceId
- `getGlobalRules()` - Get only global rules (service_id = null)
- `getServiceScopedRules(serviceId)` - Get rules for a specific service

## Manual Testing

1. **Create a global pricing rule**
   - Navigate to Business Brain > Service & Pricing tab
   - Click "Add Price Rule"
   - Enter rule name, select type (fee/surcharge/discount), amount, and leave scope as "All services"
   - Verify the rule appears in the list with "All services" badge

2. **Create a service-scoped pricing rule**
   - Click "Add Price Rule"
   - Select "Specific service" scope and choose a service from dropdown
   - Verify the rule appears with "Service: <name>" badge

3. **Edit and delete rules**
   - Click the pencil icon to edit a rule, change the scope, and save
   - Click the trash icon to delete a rule
   - Toggle the switch to enable/disable rules

## Migration

Run the following to apply the migration:

```bash
supabase db push
# or
supabase migration up
```

## Notes

- Existing global rules continue to work (service_id = null)
- The Services page (/app/services) remains unchanged; per-service pricing is still configured there
- This implementation adds tenant-level pricing RULES (surcharges, discounts, fees) that can be applied on top of base service prices
