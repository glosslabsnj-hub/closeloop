

# Fix Plan: Add `businessname` Alias for ElevenLabs Compatibility

## Problem
ElevenLabs agent is configured to expect `{{businessname}}` (no underscore) in its first message, but the system sends `business_name` (with underscore). This exact naming mismatch causes:
- Error: `"Missing required dynamic variables in first message: {'businessname'}"`  
- Close code 1008 (Policy Violation)
- Immediate disconnect every time

## Solution
Add `businessname` as a compatibility alias everywhere `business_name` is set. This is a 4-file fix that takes 2 minutes to implement.

---

## Changes

### 1. `supabase/functions/_shared/buildBusinessContext.ts` (line ~1454)
Add `businessname` alias to the canonical dynamic variables builder.

```typescript
// Line 1454 area - add this line after business_name
businessname: ctx.tenant.business_name || "Our Business",
```

**Why here**: This is the single source of truth for dynamic variables. Every channel (voice calls, browser tests, SMS) that uses `buildDynamicVariables()` will automatically get the alias.

---

### 2. `supabase/functions/elevenlabs-init/index.ts` (line ~68)
Add `businessname` to the empty defaults structure.

```typescript
// Inside getEmptyDynamicVariables(), add:
businessname: "",
```

**Why here**: Prevents cold-start or error-path disconnects when context is unavailable.

---

### 3. `supabase/functions/elevenlabs-conversation-token/index.ts` (line ~51)
Add `businessname` to the safe defaults object.

```typescript
// In the dynamicVariables initialization block, add:
businessname: "our business",
```

**Why here**: Ensures browser tests have the alias even if DB context build fails.

---

### 4. `src/components/ai/VoiceAgentTest.tsx` (line ~30-35)
Update `toSafeVars` to ensure `businessname` is always present as a client-side safety net.

```typescript
const toSafeVars = (vars: Record<string, any> | null | undefined): Record<string, string | number | boolean> => {
  if (!vars) return { businessname: "our business" };
  
  const safe = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v == null ? "" : v])
  );
  
  // Ensure businessname alias is always present (ElevenLabs expects no underscore)
  if (!safe.businessname && safe.business_name) {
    safe.businessname = safe.business_name;
  }
  if (!safe.businessname) {
    safe.businessname = "our business";
  }
  
  return safe;
};
```

**Why here**: Guarantees the simulator won't fail even if backend deployment is stale.

---

## File Summary

| File | Change |
|------|--------|
| `_shared/buildBusinessContext.ts` | Add `businessname` alias (line ~1454) |
| `elevenlabs-init/index.ts` | Add `businessname: ""` to empty defaults (line ~68) |
| `elevenlabs-conversation-token/index.ts` | Add `businessname: "our business"` to defaults (line ~51) |
| `VoiceAgentTest.tsx` | Enhance `toSafeVars` to ensure alias exists |

---

## Verification Steps

After implementation:
1. Go to `/app/simulator`
2. Click **Start Test Call**
3. In the debug panel, confirm `STARTING_SESSION` shows `businessname` key present
4. Agent should stay connected and greet you by your business name
5. Ask "What business is this?" to confirm context is working

---

## Technical Note

This fix adds a **compatibility alias** rather than changing ElevenLabs agent config. Both approaches work, but the alias approach:
- Fixes it immediately without needing ElevenLabs dashboard access
- Makes the system resilient to future naming variations
- Works for both phone calls and browser tests

