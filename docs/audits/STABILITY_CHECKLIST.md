# CloseLoop Stability Checklist

This document defines the rules for maintaining stability and correctness as the codebase evolves.

## Adding New Pages

1. **Route Registration**: Add route to `src/App.tsx` under the appropriate layout
2. **Navigation**: Add NavItem to `src/components/layouts/AppLayout.tsx` if user-facing
3. **Module Gating**: If page requires specific modules, add to `src/hooks/useRouteGuard.ts`
4. **Type Safety**: Ensure page components use proper TypeScript types

## Adding New SKUs / Plans

1. **Single Source of Truth**: All plan logic lives in `src/config/pricing.ts`
2. **Feature Helpers**: Use `hasVoiceFeature()` and `hasSmsFeature()` - never hardcode SKU checks
3. **Eligibility**: Use `isEligibleForTwilioProvision()` for telephony provisioning
4. **Database**: Update `subscriptions` table if needed via migration

## Adding New Modules

1. **Module List**: Add to `src/hooks/useTenantConfig.ts` → `defaultModulesByMode`
2. **Route Guard**: Update `src/hooks/useRouteGuard.ts` → `routeModuleRequirements`
3. **Navigation Filter**: Add `requiredModules` in `AppLayout.tsx` NavItem
4. **Feature Flag Check**: Use `useModuleEnabled()` or `useTenantConfig()` in components

## Adding New Business Modes

1. **Type Definition**: Add to `BusinessMode` type in `src/hooks/useTenantConfig.ts`
2. **Default Modules**: Add entry to `defaultModulesByMode`
3. **Templates**: Add industry templates in `src/data/industryTemplates.ts`
4. **Workflows**: Add default workflows in `src/lib/createDefaultWorkflows.ts`
5. **Automation Toggles**: Update `AUTOMATION_TOGGLES` in same file
6. **Golden Path**: Add test scenario in `src/pages/admin/AdminGoldenPathPage.tsx`

## Adding New Connectors / Integrations

1. **Provider Definition**: Add to `PROVIDERS` in `src/hooks/useIntegrations.ts`
2. **Connect Dialog**: Update `IntegrationConnectDialog.tsx` for OAuth/API key flow
3. **Test Connection**: Implement test endpoint and call in connect dialog
4. **Status Storage**: Use `integrations.status` column for connection state
5. **Help Guide**: Add step-by-step instructions in help components

## Adding New Edge Functions

1. **File Location**: `supabase/functions/{function-name}/index.ts`
2. **Config**: Add to `supabase/config.toml` with `verify_jwt` setting
3. **Shared Code**: Put reusable code in `supabase/functions/_shared/`
4. **CORS**: Include `corsHeaders` for browser access
5. **Error Handling**: Always return valid response (200 + error JSON, never raw throw)
6. **Telephony**: For Twilio endpoints, always return TwiML even on errors

## Critical Rules

### Tenant Isolation
- All queries MUST include `tenant_id` filter
- RLS policies enforce tenant isolation at DB level
- Never expose tenant IDs to other tenants

### Customer Resolution
- All phone numbers normalize to E.164 via `normalizeToE164()`
- Customer table uses `phone_e164` as primary identifier
- Always check for existing customer before insert (dedupe)

### No Hardcoded Demo Data
- Production pages must read from real database
- Demo data only in explicitly marked demo components
- Test data should use dedicated test tenant

### Feature Gating
- Use pricing helpers, never raw SKU string comparisons
- Module checks use `useModuleEnabled()` hook
- Route protection via `useRouteGuard()` or page-level check

### Error UX
- Never show "null", "undefined", or "None" to users
- Use fallback values: "Unknown caller", "Not specified", etc.
- Loading states for async operations
- Toast notifications for user actions

## Testing Checklist

Before deploying changes:

- [ ] Routes load without errors
- [ ] Module-gated routes redirect correctly when disabled
- [ ] Data reads/writes use correct tenant isolation
- [ ] No console errors in production build
- [ ] Edge functions return valid responses
- [ ] HMAC signatures verified for webhooks
- [ ] Phone numbers normalize correctly
- [ ] Customer deduplication works
