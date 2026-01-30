
# Server-Side Order Total Calculation & Full Business Intelligence

## Summary

Implement server-side order total calculation by matching parsed order items against the tenant's actual menu items and prices. This ensures every order gets an accurate total regardless of what the AI says during the call.

---

## The Problem Today

Current flow:
```text
Customer orders "lasagna, large margarita, 2-liter Pepsi"
            ↓
AI (hopefully) says "Your total is $42.50"
            ↓
Webhook parses transcript for "$42.50" via regex
            ↓
If found → stored as total_cents
If NOT found → order has no total
```

**Issues:**
1. Total depends on AI speaking it correctly
2. If regex fails to match, no total
3. Menu prices exist in database but aren't used programmatically
4. Each parsed item (e.g., "Large Margherita Pizza") isn't linked to actual menu item IDs

---

## The Solution

New flow:
```text
Customer orders "lasagna, large margarita, 2-liter Pepsi"
            ↓
Webhook parses items: [{name: "Large Margherita Pizza", qty: 1}, ...]
            ↓
Server looks up each item in menu_items table by name fuzzy match
            ↓
Calculates total: SUM(item.price_cents * qty)
            ↓
Stores: items_json with price_cents per item + calculated total_cents
```

---

## Implementation Details

### Phase 1: Menu Item Price Lookup

Create a function to match parsed order items against menu_items:

```typescript
async function matchAndPriceItems(
  supabase: SupabaseClient,
  tenantId: string,
  parsedItems: Array<{ name: string; qty: number; modifiers?: string[] }>
): Promise<{
  items: Array<{ 
    name: string; 
    qty: number; 
    price_cents: number | null;
    menu_item_id: string | null;
    matched: boolean;
    modifiers?: string[];
  }>;
  totalCents: number;
  unmatchedCount: number;
}> {
  // Fetch all menu items for tenant
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, category, price_cents")
    .eq("tenant_id", tenantId)
    .eq("is_available", true);
  
  let totalCents = 0;
  let unmatchedCount = 0;
  
  const pricedItems = parsedItems.map(item => {
    // Fuzzy match: normalize both names, find best match
    const match = findBestMenuMatch(item.name, menuItems);
    
    if (match && match.price_cents) {
      const lineTotal = match.price_cents * item.qty;
      totalCents += lineTotal;
      return {
        ...item,
        price_cents: match.price_cents,
        menu_item_id: match.id,
        matched: true,
      };
    }
    
    unmatchedCount++;
    return {
      ...item,
      price_cents: null,
      menu_item_id: null,
      matched: false,
    };
  });
  
  return { items: pricedItems, totalCents, unmatchedCount };
}
```

### Phase 2: Fuzzy Menu Matching Algorithm

Match customer speech to menu items:

```typescript
function findBestMenuMatch(
  spokenName: string,
  menuItems: Array<{ id: string; name: string; category: string; price_cents: number | null }>
): { id: string; name: string; price_cents: number | null } | null {
  const normalized = spokenName.toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/pizza$/i, "")
    .trim();
  
  // Direct match first
  for (const item of menuItems) {
    const itemNorm = item.name.toLowerCase().replace(/\s+/g, " ");
    if (itemNorm === normalized || itemNorm.includes(normalized) || normalized.includes(itemNorm)) {
      return item;
    }
  }
  
  // Size-aware matching (e.g., "large margherita" → "Margherita Pizza")
  const sizeMatch = normalized.match(/^(large|medium|small|xl|extra.?large)\s+(.+)/i);
  if (sizeMatch) {
    const sizelessName = sizeMatch[2];
    for (const item of menuItems) {
      const itemNorm = item.name.toLowerCase();
      if (itemNorm.includes(sizelessName)) {
        return item;
      }
    }
  }
  
  // Category-based matching (e.g., "Pepsi" → find in Drinks category)
  const drinkKeywords = ["pepsi", "coke", "sprite", "water", "lemonade", "tea"];
  for (const keyword of drinkKeywords) {
    if (normalized.includes(keyword)) {
      const drinkMatch = menuItems.find(m => 
        m.name.toLowerCase().includes(keyword) || 
        m.category.toLowerCase() === "drinks"
      );
      if (drinkMatch) return drinkMatch;
    }
  }
  
  return null;
}
```

### Phase 3: Update Order Creation

Modify `processFoodOrderIfApplicable` in elevenlabs-webhook:

```typescript
// After parsing items...
const parsedResult = parseNaturalLanguageItems(orderItemsRaw, payload.transcript);

// NEW: Look up prices from database
const { items: pricedItems, totalCents: calculatedTotal, unmatchedCount } = 
  await matchAndPriceItems(supabase, tenantId, parsedResult.items);

// Use calculated total, fall back to parsed total from transcript
const finalTotal = calculatedTotal > 0 ? calculatedTotal : parsedResult.totalCents;

// Store items with prices
const { data: newOrder } = await supabase
  .from("food_orders")
  .insert({
    // ... existing fields ...
    items_json: pricedItems,
    total_cents: finalTotal,
    totals_estimate: {
      subtotal: calculatedTotal,
      parsed_from_speech: parsedResult.totalCents,
      unmatched_items: unmatchedCount,
    },
  });
```

### Phase 4: Enhanced Items JSON Schema

Update the items_json structure to include price data:

```typescript
interface OrderItem {
  name: string;           // "Large Margherita Pizza"
  qty: number;            // 1
  price_cents: number | null;  // 1599 (looked up from menu)
  menu_item_id: string | null; // UUID linking to menu_items
  matched: boolean;       // true if matched to menu
  modifiers?: string[];   // ["extra cheese"]
  item_notes?: string;    // "no onions"
}
```

### Phase 5: UI Display Updates

Update OrderCard and OrderTicket to show line-item prices:

```typescript
// In OrderCard.tsx
{order.items_json?.map((item, i) => (
  <div key={i} className="flex justify-between">
    <span>{item.qty}x {item.name}</span>
    {item.price_cents && (
      <span>${((item.price_cents * item.qty) / 100).toFixed(2)}</span>
    )}
  </div>
))}
<Separator />
<div className="flex justify-between font-bold">
  <span>Total</span>
  <span>${((order.total_cents || 0) / 100).toFixed(2)}</span>
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/elevenlabs-webhook/index.ts` | Add matchAndPriceItems function, update order creation |
| `supabase/functions/elevenlabs-webhook/_shared/test-helpers.ts` | Add price matching tests |
| `src/components/orders/OrderCard.tsx` | Show line-item prices and totals |
| `src/components/orders/OrderTicket.tsx` | Show line-item prices on print tickets |
| `src/components/orders/OrderDetailsDrawer.tsx` | Enhanced price display |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/elevenlabs-webhook/price-matching.test.ts` | Tests for fuzzy menu matching |

---

## Edge Cases Handled

1. **Item not on menu**: Mark as `matched: false`, don't include in total
2. **No prices in menu**: Skip calculation, fall back to transcript-parsed total
3. **Modifiers with price impacts**: Future enhancement - for now, base price only
4. **Size variations**: Fuzzy match "large margherita" to "Margherita Pizza"
5. **Drinks/sides**: Match common names like "Pepsi" even if not exact

---

## Expected Outcomes

1. **Every order gets a calculated total** (if menu items have prices)
2. **Line-item pricing visible** on order cards and receipts
3. **Matched items link to menu_items.id** for inventory tracking
4. **Unmatched items flagged** for menu gaps detection
5. **No dependency on AI verbalization** for totals

---

## Future Enhancements

1. **Modifier pricing**: Add price_cents to modifiers, include in total
2. **Size-based pricing**: Support large/medium/small price tiers
3. **Tax calculation**: Apply local tax rates
4. **Tip suggestions**: Calculate suggested tip amounts
5. **Menu gap detection**: Auto-create knowledge gaps for unmatched items
