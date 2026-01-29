

# Upgrade trigger-workflow Edge Function
## Merge cleaner architecture with existing functionality

---

## Summary

This plan upgrades the `trigger-workflow` edge function to incorporate the cleaner architecture from your provided implementation while preserving critical functionality like CORS headers, entity context building, location-specific workflows, and Twilio SMS integration.

---

## Key Improvements from Your Version

| Feature | Benefit |
|---------|---------|
| Modern imports | Uses `jsr:@supabase/functions-js/edge-runtime.d.ts` for better Deno compatibility |
| `json()` helper | Cleaner response handling |
| Adjacency list graph | More efficient edge traversal |
| `evalCondition()` | Flexible condition evaluation with `equals`, `exists` operators |
| Nested path support | `set_field` can update nested objects like `details.priority` |
| `loadDeliverySettings()` | Makes delivery config available in context for webhook URLs, notify phones |
| `details` pass-through | Caller can provide additional context data |

---

## Features to Preserve from Current Version

| Feature | Why Important |
|---------|---------------|
| CORS headers | Required for browser-based API calls |
| `buildContext()` | Auto-fetches order/booking/dispatch/call data from database |
| Location-specific workflows | Supports multi-location businesses |
| Template resolution `{{var}}` | Used by SMS/email message templates |
| Twilio SMS integration | Production SMS sending |
| `workflow_scheduled_steps` | Enables delay node scheduling |
| Comprehensive step logging | Detailed run history |

---

## Implementation Changes

### 1. Update Imports and Helpers

```typescript
// Before
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// After
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Add helper
function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { "content-type": "application/json", ...corsHeaders, ...headers } 
  });
}
```

### 2. Refactor Graph Loading

Replace current node/edge fetching with adjacency list approach:

```typescript
async function loadGraph(supabase: any, workflow_id: string) {
  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from("workflow_nodes").select("*").eq("workflow_id", workflow_id),
    supabase.from("workflow_edges").select("*").eq("workflow_id", workflow_id),
  ]);
  
  if (nodesRes.error) throw new Error(nodesRes.error.message);
  if (edgesRes.error) throw new Error(edgesRes.error.message);

  const nodes = nodesRes.data ?? [];
  const edges = edgesRes.data ?? [];

  // Build adjacency list for efficient traversal
  const outgoing = new Map<string, any[]>();
  for (const e of edges) {
    const arr = outgoing.get(e.from_node_id) ?? [];
    arr.push(e);
    outgoing.set(e.from_node_id, arr);
  }

  // Find start node
  const incomingCount = new Map<string, number>();
  for (const n of nodes) incomingCount.set(n.id, 0);
  for (const e of edges) {
    incomingCount.set(e.to_node_id, (incomingCount.get(e.to_node_id) ?? 0) + 1);
  }

  let start = nodes.find((n: any) => (n.name || "").toLowerCase() === "start")?.id;
  if (!start) start = nodes.find((n: any) => (incomingCount.get(n.id) ?? 0) === 0)?.id;
  if (!start && nodes.length > 0) start = nodes[0].id;

  return { nodes, edges, outgoing, start };
}
```

### 3. Add Flexible Condition Evaluator

Support both the new `equals`/`exists` format and existing format:

```typescript
function evalCondition(condition: any, ctx: Record<string, any>): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;

  // New format: { "equals": ["order_type", "delivery"] }
  if (condition.equals?.length === 2) {
    const [path, value] = condition.equals;
    const got = resolvePath(path, ctx);
    return String(got) === String(value);
  }
  
  // New format: { "exists": ["customer_email"] }
  if (condition.exists?.length === 1) {
    const [path] = condition.exists;
    const got = resolvePath(path, ctx);
    return got !== undefined && got !== null && got !== "";
  }

  // Existing format: { index: 0 } for branch nodes
  if (condition.index !== undefined) return true; // Handled by branch node logic

  return false;
}

function resolvePath(path: string, ctx: Record<string, any>): any {
  return path.split(".").reduce((acc: any, k: string) => (acc ? acc[k] : undefined), ctx);
}
```

### 4. Add Delivery Settings Loading

```typescript
async function loadDeliverySettings(supabase: any, tenant_id: string) {
  const { data } = await supabase
    .from("universal_delivery_settings")
    .select("*")
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  return data ?? {};
}
```

### 5. Enhance Context Building

Add delivery settings and pass-through details to context:

```typescript
// In main handler, after building entity context:
const delivery = await loadDeliverySettings(supabase, tenant_id);
const details = body.details ?? {};

const context = {
  ...await buildContext(supabase, entity_type, entity_id, tenant_id),
  delivery,
  details,
  customer: body.customer ?? {},
  summary: body.summary ?? "",
};
```

### 6. Enhanced set_field with Nested Path Support

```typescript
async function executeSetField(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  // Support nested path like "details.priority"
  const path = String(config?.path || config?.entity_field || "");
  const value = resolveTemplate(String(config?.value || ""), context);
  
  if (!path) {
    throw new Error("set_field requires 'path' or 'entity_field'");
  }

  // If path contains dots, update context directly (for workflow variables)
  if (path.includes(".")) {
    const parts = path.split(".");
    let cur = context;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {};
      cur = cur[parts[i]];
    }
    const oldValue = cur[parts[parts.length - 1]];
    cur[parts[parts.length - 1]] = value;
    return { path, old_value: oldValue, new_value: value, type: "context" };
  }

  // Otherwise, update entity in database (existing logic)
  // ... keep existing entity update logic
}
```

### 7. Webhook with Fallback URL

```typescript
async function executeWebhookPush(
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  // Allow config URL or fallback to delivery settings
  const url = config?.url || context.delivery?.webhook_url;
  
  if (!url) {
    return { ok: false, skipped: true, reason: "No webhook URL configured" };
  }
  
  // ... rest of implementation
}
```

---

## Request Body Changes

The updated function will accept an enhanced request body:

```typescript
interface TriggerWorkflowRequest {
  tenant_id: string;
  trigger: string;
  entity_type: string;
  entity_id: string;
  location_id?: string;
  details?: Record<string, any>;  // NEW: Additional context data
  customer?: Record<string, any>; // NEW: Customer data if known
  summary?: string;               // NEW: Summary text
}
```

---

## File Changes

| File | Changes |
|------|---------|
| `supabase/functions/trigger-workflow/index.ts` | Refactor with cleaner architecture, add adjacency list, enhanced condition evaluation, delivery settings integration, nested path support |

---

## Backward Compatibility

All changes are backward compatible:
- Existing workflow definitions continue to work
- Existing node configs are supported
- New `details`/`customer`/`summary` fields are optional
- Branch conditions support both old `{ index: N }` and new `{ equals: [...] }` formats

---

## Technical Details

### Merged Condition Evaluation Logic

The new implementation supports multiple condition formats:

1. **Edge conditions (new format)**:
   ```json
   { "equals": ["order_type", "delivery"] }
   { "exists": ["customer_email"] }
   ```

2. **Branch node conditions (existing format)**:
   ```json
   { "conditions": [{ "field": "status", "op": "eq", "value": "confirmed" }] }
   ```

3. **Edge index matching (existing format)**:
   ```json
   { "index": 0 }
   ```

### Graph Traversal

The adjacency list approach provides O(1) lookup for outgoing edges vs O(n) filter in the current implementation, improving performance for complex workflows.

