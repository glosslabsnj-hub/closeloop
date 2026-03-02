# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 9:21 AM ET (receptionist_fix — Cancel booking fix + migration push)

### What Was Done
- **Cancel booking dialog fix (handoff #170)**: Refactored CancelBookingDialog to accept `onConfirm` callback from parent instead of creating its own `useBookings()` hook. Eliminates potential stale state causing 403.
- **Dialog overlay conflict fix**: Added 250ms delay between Sheet close and AlertDialog open to prevent backdrop overlap. Added `z-[60]` on AlertDialogContent for layering safety.
- **6 pending DB migrations pushed**: 20260228 through 20260302 — bookings UPDATE/DELETE RLS policies, services deposit_amount, leads/conversations/messages/ai_call_sessions RLS, has_tenant_access super_admin fix, staff_members RLS, notification_preferences WITH CHECK fix.
- **Migration idempotency**: Fixed 20260228080000 to use DROP POLICY IF EXISTS before CREATE POLICY.

### Build Status
- Build: Clean (0 errors)
- Tests: 360/360 passing
- Commit: dc16952
- Deployed to production (app.getfluxdata.com returns 200)
- Handoff #170 completed, handoff #176 filed to QA

### MODE PROGRESS
- SERVICE: 13/42 QA-verified (31%) ← FOCUS
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
- **RLS WITH CHECK**: Every `FOR ALL` policy MUST have both `USING` and `WITH CHECK`.
- **Cross-mode safety**: ServiceCatalogEditor checks `businessMode` before showing POS import.
- **GoLiveStep defers refreshTenant**: Completion screen must render before DashboardPage swaps to LiveDashboard.
- **Service deletion FK constraint**: Services linked to bookings can't be deleted. Use `is_active=false` to deactivate instead.
- **Test tenant seeding**: Use `scripts/seed-test-tenants-bulk.ts` with service role key.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay to avoid backdrop overlap.
- **Migration push**: Supabase CLI has version mismatch issues. Use Management API `/database/query` endpoint as fallback.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- 5 functional gates blocked on test tenant slug lookup (tenants exist but QA may search by slug)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA re-verification of cancel booking + completion screen (handoffs #175, #176)
2. Stripe Customer Portal edge function (future eng session)
