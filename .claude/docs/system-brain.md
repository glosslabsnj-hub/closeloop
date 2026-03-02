# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 8:52 AM ET (receptionist_eng — HVAC catalog expansion + billing UI)

### What Was Done
- **HVAC service catalog expanded (6→12)**: Added AC Repair, Furnace Repair, AC Installation, Furnace Installation, Mini-Split Installation, Heat Pump Service. Updated industryCatalog.ts (onboarding defaults) + testTenantMatrix.ts (test tenant seed data). Reseeded HVAC test tenant in Supabase — old services deactivated (FK constraint), new 12 inserted. FAQs consolidated (removed duplicate financing, added maintenance plan FAQ).
- **SubscriptionDetailsCard added to Plan & Billing**: New component shows subscription status badge, renewal/trial-end date, payment method placeholder, invoice section, and support contact. Plan tab now renders PlanUpgradeCard + SubscriptionDetailsCard + MultiLocationManager.
- **Bulk seeding script**: Created `scripts/seed-test-tenants-bulk.ts` for seeding all test tenants from testTenantMatrix.ts using service role key. All 4 blocked tenants confirmed existing in Supabase.
- **Industry examples updated**: HVAC placeholder text in industryExamples.ts updated to reflect new services (AC Repair first, installation pricing).

### Build Status
- Build: Clean (0 errors)
- Tests: 360/360 passing
- Commit: 53ced53
- Frontend deployed to app.getfluxdata.com
- Handoff #172 completed, handoff #174 filed to QA

### MODE PROGRESS
- SERVICE: 14/42 QA-verified (33%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **deposit_amount**: Exists on BOTH services table (per-service) AND assistant_settings (tenant-wide policy text).
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **AI Readiness quality checks**: `quality_services_count` filters out placeholder services.
- **Tenant persistence**: `localStorage.setItem("flux_admin_active_tenant_id", tenantId)` on switch.
- **Readiness loading race condition**: useAIReadinessV2 returns empty flags while loading. Check `loading` first.
- **RLS WITH CHECK**: Every `FOR ALL` policy MUST have both `USING` and `WITH CHECK`.
- **Cross-mode safety**: ServiceCatalogEditor checks `businessMode` before showing POS import.
- **CONVERSION_OUTCOMES map**: useIntelligence.ts maps each business mode to its valid conversion outcome types.
- **Service deletion FK constraint**: Services linked to bookings can't be deleted. Use `is_active=false` to deactivate instead.
- **Test tenant seeding**: Use `scripts/seed-test-tenants-bulk.ts` with service role key. Existing tenants are skipped. Use `scripts/reseed-hvac-services.ts` to reseed HVAC specifically.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- Guided Setup wizard: expandable completed steps (handoff to UX, #168)
- Cancel booking 403 bug (handoff to fix, #174)
- 5 functional gates blocked on test tenant slug lookup (tenants exist but QA may search by slug)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA re-verification of billing page + HVAC services (handoff #174 filed)
2. Cancel booking 403 fix (receptionist_fix)
3. SetupWizard expandable steps (receptionist_ux)
4. Stripe Customer Portal edge function (future eng session)
