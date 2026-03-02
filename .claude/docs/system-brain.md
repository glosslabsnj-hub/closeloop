# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 3:15 AM ET (receptionist_eng — 8 bug fixes from QA handoffs)

### What Was Done
- **RLS booking creation fix**: CreateBookingDialog was manually querying `tenant_users` table to get tenant_id — failed for super admins testing other tenants. Now uses `useAuth().effectiveTenantId` from AuthContext. Same fix applied to `useEstimates`.
- **Readiness score fix**: Dashboard showed 100% AI readiness even when Services=0% and AI Behavior=11%. Root cause: old `calculateReadinessFromContext` had broken scoring. Migrated DashboardHeroCard, KnowledgeStatusBar, AIReadinessScore to use `useAIReadinessV2` server-side RPC which correctly flags P0 blockers.
- **Business Hours settings page**: Added "Business Hours" to Settings sidebar (both desktop SettingsSidebar and MobileSettingsNav). Reuses existing BusinessHoursManager component from Business Brain. Default section changed from "team" to "hours".
- **Team management RLS fix**: useStaffMembers now uses `effectiveTenantId`. Created migration `20260302080000_fix_staff_members_rls_superadmin.sql` adding super_admin bypass to INSERT/UPDATE/DELETE policies. Applied to Supabase.
- **Stale call display fix**: Calls >30min with no `ended_at` now show "Ended (duration unknown)" instead of infinite "Call in progress..." spinner. Also hides the Loader2 animation for stale calls.
- **Cross-mode console errors**: booking_delivery_settings query in useBrainSummaries now gated by `hasBookingMode` (service/medical/sales only). Changed `.single()` to `.maybeSingle()` to prevent errors on missing rows.
- **Better error messages**: useStaffMembers mutations now log errors to console and show error.message in toast instead of generic "Failed to add team member".

### Build Status
- Build: Clean (0 errors)
- Tests: 343/343 passing
- Commit: 251d0fd

### MODE PROGRESS
- SERVICE: 11/42 QA-verified (26%) ← FOCUS. 8 more fixes done, awaiting QA re-verification.
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns (learned this session)
- **effectiveTenantId pattern**: ANY component that creates/updates data must use `useAuth().effectiveTenantId`, not `tenant?.id`. The `effectiveTenantId` is the switched-to tenant for admins, falling back to own tenant for regular users. Affected: CreateBookingDialog, useEstimates, useStaffMembers.
- **Readiness score**: TWO systems exist. Old client-side `calculateReadinessFromContext` is BROKEN (shows 100% falsely). New server-side `useAIReadinessV2` via `get_ai_readiness` RPC is CORRECT. All dashboard components now use V2.
- **Admin UI bar**: The super admin toolbar (tenant switcher, mode selector) is BY DESIGN for admins. It only shows when `isSuperAdmin=true`. Not a bug — admins need it to switch between test tenants.
- **Stale calls**: ElevenLabs webhook sometimes doesn't fire, leaving `ended_at=null` forever. The 30-minute threshold in formatDuration is a display-layer fix; the root fix would be a cron job to close stale sessions.

### Database Changes Applied
- staff_members RLS: super_admin bypass added to INSERT/UPDATE/DELETE policies

### Remaining from QA Handoffs (not fixed this session)
- ID:80 - Onboarding template auto-apply: Investigation shows templates ARE correctly coded. HVAC services defined in industryCatalog.ts. Likely a downstream display/RLS issue, needs browser debugging.
- ID:87 - Cross-mode data in service edit form: "vehicle info" showing for HVAC services. Needs investigation of required_collection_fields in services table data.
- ID:91 - Admin UI "leak": Working as designed — super admin bar is needed for tenant switching.

### Next Priorities
1. QA re-verification of 5 gates (handoffs filed: 104-108)
2. Investigate onboarding template application (ID:80) — needs browser-level debugging
3. Cross-mode data in service fields (ID:87) — may be a data issue, not code
4. Console errors from other sources (Mapbox token, etc.)
