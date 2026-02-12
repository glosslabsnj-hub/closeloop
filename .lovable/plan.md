

# Fix: Services Completion + Optional Coverage Step

Two focused fixes that won't conflict with Claude Code's work (these are Hub completion logic only).

---

## Fix 1: Services Still Showing 50%

**Problem:** Two bugs in `BusinessBrainHub.tsx`:
- The Hub caches service data under `["services-count", tenant.id]` but the service editor invalidates `["services", tenant.id]`. So new services don't show up until you reload.
- Only services with `price_amount > 0` count as "configured." Services set to "Quote Only" (a valid pricing choice) are ignored.

**Changes in `src/components/brain/hub/BusinessBrainHub.tsx`:**
- Line 63: Change query key from `["services-count", tenant?.id]` to `["services", tenant?.id]`
- Line 68: Change `.select("id, price_amount")` to `.select("id, price_amount, price_type")`
- Lines 138-140: Update the completion filter to count a service as configured if it has EITHER a price amount greater than zero OR a `price_type` set (meaning the owner made a deliberate pricing decision like "quote only", "fixed", or "starting at")

---

## Fix 2: Coverage Step Should Be Optional for Walk-In Businesses

**Problem:** The "Coverage" step requires an address to be marked complete. But a local auto shop, salon, dentist, or restaurant where customers come to the business doesn't need a "service area." They serve whoever walks in or calls, regardless of where the customer lives.

**Approach:** Use the existing capability system to determine if coverage is relevant. Businesses that don't do mobile/dispatch/delivery work should either skip the coverage step entirely or auto-complete it.

**Changes in `src/components/brain/hub/hubStepsConfig.ts`:**
- Add `"general"` to the coverage step's `hiddenModes` array (general businesses rarely need coverage)
- Add a new capability flag check: if `capabilities.mobileService` is not true AND mode is `"service"`, hide coverage (they're a fixed-location business)

**Changes in `src/components/brain/hub/BusinessBrainHub.tsx`:**
- Update the `coverage` completion check (line 142-143): For businesses where customers come to them (no mobile service, not dispatch, not food delivery), auto-mark coverage as complete
- The logic becomes: if coverage step is visible, check for address; if the business is walk-in only, it's automatically complete

This way, Smiles Auto Works -- a local shop where customers drive to them -- won't be penalized for not defining a coverage area.

---

## What Won't Change (No Claude Code Conflicts)

- No new files created
- No database changes
- No edge function changes
- Only two files modified, both in the Hub completion logic layer
- Phase 1/2/3 work in Claude Code touches different files (sidebar, onboarding, industry config)

