# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 4:15 AM ET (receptionist_ux — cross-mode + mobile fixes)

### What Was Done
- **Cross-mode terminology (HIGH)**: Paste from POS button hidden for non-food modes (ServiceCatalogEditor). TeachAI upload text mode-aware ("menus" only for food). Catalog guidance generic (removed "menu items, procedures").
- **Mobile 375px overflow (HIGH)**: BusinessHoursEditor time selectors: w-[90px] on mobile (was w-[120px]). Day labels: w-16 (was w-24). OnboardingAI tone grid: tighter padding/gaps. A2P address fields: 2-col on mobile, 6-col on sm+. ServicePreviewStep edit form: flex-wrap + w-24 inputs. CallbackDashboardLayout: removed min-w-[200px].
- **AI Insights mode leak (filed to eng)**: 3 edge functions query ai_knowledge_base without mode filter. useIntelligence.ts counts wrong-mode outcomes.

### Build Status
- Build: Clean (0 errors)
- Tests: 343/343 passing
- Commit: a3396ae

### MODE PROGRESS
- SERVICE: 11/42 QA-verified (26%) ← FOCUS. 4 more gates moved to in_progress.
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Readiness loading race condition**: useAIReadinessV2 returns empty flags while loading. Any component using flags to determine completion MUST check `loading` first.
- **RLS WITH CHECK**: Every Supabase RLS policy using `FOR ALL` MUST have both `USING` and `WITH CHECK`.
- **Integration mode filtering**: `modes` property on integration cards controls visibility per business mode.
- **Cross-mode safety**: ServiceCatalogEditor checks `businessMode` before showing POS import. TeachAISection uses `businessMode` for upload copy. brainGuidance "what" fields should be generic; mode-specific language goes in "tips".

### Remaining Work
- ID:97 - Plan/Billing page only shows Multi-Location section — needs full billing UI
- AI Insights edge functions need mode-aware knowledge base filtering (handoff #119)
- More test tenants need customServices (salon, plumber, detailing, cleaning, consultant)
- FoodSetupEditor grid-cols-12 needs mobile breakpoint (not blocking service mode)

### Next Priorities
1. QA re-verification of 4 UX gates (handoff #118 filed)
2. AI Insights mode filtering (eng handoff #119)
3. Plan/Billing page needs payment method management + invoice history
