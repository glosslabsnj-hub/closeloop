# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 6:36 AM ET (receptionist_eng — 6 critical bug fixes + deployment)

### What Was Done
- **deposit_amount column added to services** (URGENT): Column never existed despite being referenced in ServiceCatalogEditor, writeBrainFact, and build-business-brain. Add Service form was crashing. Fixed via migration.
- **RLS policies for leads/bookings/conversations/messages** (CRITICAL): All 4 tables had RLS enabled but ZERO policies. Every client-side operation on these tables failed silently with 42501. Added 16 policies (SELECT/INSERT/UPDATE/DELETE + service_role for each table).
- **AI Readiness no longer lies** (HIGH): Was showing 100% for tenants with placeholder services. Fixed: now checks for quality services (non-placeholder descriptions, non-generic names), uses ai_assistants table for greeting check, removed auto-awarded intake points. HVAC test tenant now shows 87% with `placeholder_services` P0 flag.
- **build-business-brain edge function** (URGENT): Fixed null-safe access on `p.title?.toLowerCase()` to prevent crash when knowledge base entries have null titles. Redeployed.
- **Tenant context persistence** (MEDIUM): Admin active tenant ID now persisted in localStorage. On page reload, cached tenant ID is used to immediately pre-fetch the correct tenant data before auth completes. Prevents flash of wrong tenant.

### Build Status
- Build: Clean (0 errors)
- Tests: 360/360 passing
- Commits: 97e076c, 7e743d5
- Frontend deployed to app.getfluxdata.com
- Edge function deployed: build-business-brain
- Migration applied: deposit_amount column, 16 RLS policies, updated get_ai_readiness RPC

### MODE PROGRESS
- SERVICE: 12/42 QA-verified (29%) ← FOCUS. 4 more gates set to in_progress.
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **deposit_amount**: Now exists on BOTH services table (per-service amount) AND assistant_settings (tenant-wide policy text). The per-service numeric amount is what the brain and UI use.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass. Use `tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')`.
- **AI Readiness quality checks**: `quality_services_count` filters out services with "Sample service" descriptions, names ending in "Service N", or descriptions under 20 chars. Score uses quality count, not total count.
- **Tenant persistence**: `localStorage.setItem("flux_admin_active_tenant_id", tenantId)` on switch, read on AuthProvider mount, cleared on sign out. Pre-fetches cached tenant in fetchTenantData for super admins.
- **Readiness loading race condition**: useAIReadinessV2 returns empty flags while loading. Any component using flags to determine completion MUST check `loading` first.
- **RLS WITH CHECK**: Every Supabase RLS policy using `FOR ALL` MUST have both `USING` and `WITH CHECK`.
- **Cross-mode safety**: ServiceCatalogEditor checks `businessMode` before showing POS import. brainGuidance "what" fields should be generic; mode-specific in "tips".
- **CONVERSION_OUTCOMES map**: useIntelligence.ts maps each business mode to its valid conversion outcome types.

### Remaining Work
- Plan/Billing page needs full billing UI (payment methods, invoices, cancel/downgrade)
- Guided Setup wizard skips to completion for existing tenants (handoff #136)
- Generic placeholder services/FAQs should be replaced with HVAC-specific seed data
- Developer Tools Last Call Context shows empty values (low priority)
- 5 functional gates blocked on missing test tenants in Supabase

### Next Priorities
1. QA re-verification of all in_progress gates (handoff #159 filed)
2. Replace HVAC placeholder services with real HVAC services
3. Plan/Billing page billing UI
4. Test tenant seeding for blocked functional gates
