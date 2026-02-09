

# Fix Build Errors — TypeScript 'unknown' Type Issues

## Overview

Three TypeScript errors need to be fixed where `err` is of type `unknown` but we're trying to access `.message` property directly.

## Changes Required

### Fix 1: `supabase/functions/detect-patterns/index.ts` (line 511)

**Current code:**
```typescript
} catch (err) {
  console.error("[detect-patterns] Error:", err);
  return errorResponse(`Internal error: ${err.message}`, 500);
}
```

**Fixed code:**
```typescript
} catch (err) {
  console.error("[detect-patterns] Error:", err);
  return errorResponse(`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
}
```

---

### Fix 2: `supabase/functions/process-call-outcome/index.ts` (line 147)

**Current code:**
```typescript
} catch (err) {
  console.error("[process-call-outcome] Error:", err);
  return errorResponse(`Internal error: ${err.message}`, 500);
}
```

**Fixed code:**
```typescript
} catch (err) {
  console.error("[process-call-outcome] Error:", err);
  return errorResponse(`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
}
```

---

### Fix 3: `src/components/ai/VoiceAgentTest.tsx` (lines 32-48)

**Current code:**
```typescript
const toSafeVars = (vars: Record<string, unknown> | null | undefined): Record<string, string | number | boolean> => {
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

**Fixed code:**
```typescript
const toSafeVars = (vars: Record<string, unknown> | null | undefined): Record<string, string | number | boolean> => {
  if (!vars) return { businessname: "our business" };
  
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      safe[k] = v;
    } else if (v == null) {
      safe[k] = "";
    } else {
      safe[k] = String(v);
    }
  }
  
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

---

## Why These Fixes Work

1. **Edge Functions (Fixes 1 & 2):** In TypeScript, caught errors are typed as `unknown`. We need to check if the error is an `Error` instance before accessing `.message`.

2. **VoiceAgentTest (Fix 3):** `Object.fromEntries` returns `{ [k: string]: unknown }` which doesn't match the return type. By explicitly typing `safe` and using a for-loop with type guards, we ensure only valid types are assigned.

## Files Changed
- `supabase/functions/detect-patterns/index.ts` — 1 line
- `supabase/functions/process-call-outcome/index.ts` — 1 line  
- `src/components/ai/VoiceAgentTest.tsx` — ~10 lines

