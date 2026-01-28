
# Plan: FOOD-ONLY Order Handoff + Printing

## Overview
Implement a complete order management and handoff system exclusively for food-mode tenants. When the AI takes an order on a call, it will be auto-confirmed, stored, and pushed to the restaurant's chosen destinations (internal queue, webhook, email, SMS) with kitchen-friendly printing support.

---

## Phase 1: Database Schema

### 1.1 Extend `food_orders` Table
The existing table has most fields but needs additions:

**Add columns:**
```sql
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS requested_time timestamptz;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS address_json jsonb;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS totals_estimate jsonb;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS handoff_state jsonb DEFAULT '{}';

-- Update status enum to include needs_followup
-- Existing: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled
-- Need to add: needs_followup
```

**items_json structure (document existing format + ensure support):**
```json
{
  "name": "Margherita Pizza",
  "qty": 2,
  "base_price": 1599,
  "modifiers": ["extra cheese", "well done"],
  "item_notes": "cut in squares"
}
```

### 1.2 Create `order_delivery_settings` Table
```sql
CREATE TABLE order_delivery_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  handoff_methods jsonb DEFAULT '["internal"]',
  webhook_url text,
  webhook_secret text,
  notify_email text,
  notify_phone text,
  print_format text DEFAULT 'ticket_80mm' CHECK (print_format IN ('ticket_80mm', 'letter')),
  auto_print boolean DEFAULT false,
  cancel_window_minutes integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_delivery_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant order delivery settings"
  ON order_delivery_settings FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage order delivery settings"
  ON order_delivery_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
    ) OR has_role(auth.uid(), 'super_admin')
  );
```

### 1.3 Create `handoff_attempts` Table
```sql
CREATE TABLE handoff_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('webhook', 'email', 'sms', 'print')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_handoff_attempts_order ON handoff_attempts(order_id);
CREATE INDEX idx_handoff_attempts_tenant ON handoff_attempts(tenant_id);

-- RLS
ALTER TABLE handoff_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant handoff attempts"
  ON handoff_attempts FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can manage their tenant handoff attempts"
  ON handoff_attempts FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id));
```

### 1.4 Add `needs_followup` Status to food_orders Enum
```sql
-- Check if needs_followup already exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'needs_followup' AND enumtypid = 'order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'needs_followup';
  END IF;
END$$;
```

---

## Phase 2: Backend Edge Functions

### 2.1 Create `order-handoff` Edge Function
**Purpose:** Execute handoff methods (webhook, email, SMS) when an order is created or status changes.

**File:** `supabase/functions/order-handoff/index.ts`

**Flow:**
1. Receive order_id and tenant_id
2. Fetch order details and order_delivery_settings
3. For each enabled method:
   - **webhook**: POST JSON with HMAC signature
   - **email**: Send formatted order summary via email service
   - **sms**: Send concise summary via Twilio SMS
4. Log each attempt to `handoff_attempts`
5. Update `food_orders.handoff_state` with results

**Webhook Payload Structure:**
```json
{
  "event": "order.created",
  "order_id": "uuid",
  "order_number": "ORD-101",
  "order_type": "pickup",
  "customer": {
    "name": "John Smith",
    "phone": "+15551234567"
  },
  "items": [...],
  "special_instructions": "NO ONIONS!",
  "requested_time": "2026-01-28T18:30:00Z",
  "totals": {...},
  "created_at": "..."
}
```

**Signature Header:** `X-CloseLoop-Signature: sha256=<hmac>`

### 2.2 Update `elevenlabs-webhook` Function
**Add food order creation logic:**

When `business_mode = 'food'` and AI confirms an order:
1. Extract order data from `data_collection`:
   - `order_items` (array)
   - `order_type` (pickup/delivery)
   - `special_instructions`
   - `requested_time`
   - `delivery_address` (if delivery)
2. Create `food_orders` record with `status = 'confirmed'`
3. Call `order-handoff` function to trigger notifications
4. If AI was uncertain → create with `status = 'needs_followup'`

### 2.3 Update ElevenLabs Agent Prompt (Configuration)
The AI needs clear instructions for food mode:
- Collect: order items, modifiers, special instructions, pickup/delivery, time
- Read back complete order and ask for confirmation
- Only confirm after explicit customer agreement
- Mark unclear orders as needs_followup

---

## Phase 3: Frontend Components

### 3.1 Food Module Check Hook
Create utility for checking food mode:

**File:** `src/hooks/useFoodMode.ts`
```typescript
export function useFoodMode() {
  const { businessMode, enabledModules } = useTenantConfig();
  
  const FOOD_MODULES = ["food_orders", "menu_knowledge", "reservations", "catering"];
  const isFoodMode = businessMode === "food" || 
    FOOD_MODULES.some(m => enabledModules.includes(m));
  
  return { isFoodMode };
}
```

### 3.2 Settings → Food Tab (Order Delivery)
**File:** `src/components/settings/FoodOrderSettings.tsx`

**UI Elements:**
- Toggle: Enable order handoff
- Multi-select checkboxes: Internal Queue (always on), Webhook, Email, SMS, Print
- Conditional inputs:
  - Webhook URL + Webhook Secret (when webhook selected)
  - Notify Email (when email selected)
  - Notify Phone (when SMS selected)
  - Print Format dropdown (ticket_80mm / letter)
  - Auto-print toggle
  - Cancel window dropdown (0, 2, 5 minutes)
- Test buttons section:
  - "Send Test Webhook"
  - "Send Test Email"
  - "Send Test SMS"
  - "Test Print Ticket"
- Info box explaining auto-confirm behavior

### 3.3 Update SettingsPage.tsx
Add conditional "Food" tab that only shows for food tenants:
```typescript
{isFoodMode && (
  <TabsTrigger value="food" className="gap-2">
    <UtensilsCrossed className="h-4 w-4" />
    <span className="hidden sm:inline">Food</span>
  </TabsTrigger>
)}
```

### 3.4 Enhanced OrdersPage.tsx
**Major UI Improvements:**

1. **Kitchen-friendly card view option** (alongside table)
   - Large order cards with prominent status badges
   - Big SPECIAL INSTRUCTIONS block
   - Quick action buttons

2. **Order Details Drawer/Dialog:**
   - Customer name + phone (click to call)
   - Requested time display
   - Address block (if delivery/catering)
   - Items list:
     - Qty x Item Name
     - Modifiers (indented, smaller)
     - Item notes (italic)
   - **SPECIAL INSTRUCTIONS** (large, prominent box)
   - Handoff Status Panel:
     - Show which methods succeeded/failed
     - Retry buttons for failed methods
   - Status action buttons: Preparing / Ready / Completed / Cancel

3. **Actions:**
   - Print Ticket button
   - Mark status dropdown
   - Cancel with reason
   - Needs Follow-up flag

4. **New Order Alert:**
   - When `auto_print = true` and new confirmed order arrives
   - Show modal: "New order ready to print" with Print button
   - Optional sound toggle (localStorage preference)

### 3.5 Print Ticket Component
**File:** `src/components/orders/OrderTicket.tsx`

**Two formats:**

**ticket_80mm (thermal printer style):**
```
================================
      BELLA ITALIA RISTORANTE
================================
Order: ORD-101
Date: Jan 28, 2026 6:30 PM

Type: PICKUP
Time: ASAP
--------------------------------
Customer: John Smith
Phone: (555) 123-4567
--------------------------------
ITEMS:

2x Margherita Pizza
   + extra cheese
   + well done
   (cut in squares)

1x Spaghetti Carbonara
   + no bacon

1x Tiramisu
--------------------------------
*** SPECIAL INSTRUCTIONS ***
FOOD ALLERGY: NO NUTS
Customer has severe nut allergy
Use dedicated prep area
--------------------------------
Subtotal: $45.97
Tax: $3.68
TOTAL: $49.65
================================
Auto-confirmed by phone
================================
```

**letter format:**
- Full 8.5x11 format
- Business header with logo space
- More spacing and larger fonts
- Same content sections

**Print CSS:**
```css
@media print {
  .ticket-80mm {
    width: 80mm;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }
  .ticket-letter {
    width: 8.5in;
    font-family: Arial, sans-serif;
  }
  .special-instructions {
    border: 2px solid black;
    padding: 8px;
    font-weight: bold;
    font-size: 14px;
  }
}
```

### 3.6 Print Ticket Route
**File:** `src/pages/app/OrderTicketPage.tsx`
- Route: `/app/orders/:orderId/ticket`
- Fetches order data
- Renders `OrderTicket` component
- Auto-triggers `window.print()` on load (optional)
- Print button in header

---

## Phase 4: Navigation Gating

### 4.1 Verify AppLayout.tsx Gating
The navigation already gates food pages by `requiredModules`. Verify these mappings:
- `/app/orders` → `["food_orders"]` ✓
- `/app/menu-center` → `["menu_knowledge"]` ✓
- `/app/reservations` → `["reservations"]` ✓
- `/app/catering` → `["catering"]` ✓

### 4.2 Settings Tab Gating
Only show Food settings tab when tenant has food modules enabled.

---

## Phase 5: Testing & Edge Cases

### 5.1 Acceptance Tests

**Food Tenant Flow:**
1. Switch to Food mode via AdminModeSwitcher
2. Verify Orders, Menu Center, Reservations, Catering appear in nav
3. Go to Settings → Food tab exists
4. Configure webhook URL and enable
5. Simulate AI order creation (via test call or manual insert)
6. Verify order appears in Orders queue
7. Click Print Ticket → verify formatting
8. Check handoff_attempts logged

**Non-Food Tenant Flow:**
1. Switch to Service mode
2. Verify Orders, Menu Center, Reservations, Catering are HIDDEN in nav
3. Verify Settings has NO Food tab
4. Direct URL access to `/app/orders` should redirect or show empty

### 5.2 Edge Cases
- **Webhook failure:** Order stays in queue, handoff_state shows failure, retry available
- **Unclear/custom order:** Status = needs_followup with explanation in special_instructions
- **Cancel window SMS:** If SMS module present, send cancel option text

---

## File Summary

### New Files
| File | Description |
|------|-------------|
| `supabase/functions/order-handoff/index.ts` | Edge function for webhook/email/sms delivery |
| `src/hooks/useFoodMode.ts` | Hook to check if tenant is in food mode |
| `src/components/settings/FoodOrderSettings.tsx` | Food delivery settings UI |
| `src/components/orders/OrderTicket.tsx` | Printable ticket component |
| `src/components/orders/OrderDetailsDrawer.tsx` | Full order view with items, modifiers, handoff status |
| `src/pages/app/OrderTicketPage.tsx` | Dedicated print route |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/app/SettingsPage.tsx` | Add conditional Food tab |
| `src/pages/app/OrdersPage.tsx` | Add drawer, items display, print button, new order alert |
| `supabase/functions/elevenlabs-webhook/index.ts` | Add food order creation from call data |
| `src/App.tsx` | Add /app/orders/:orderId/ticket route |

### Database Changes
| Change | Type |
|--------|------|
| `order_delivery_settings` | New table |
| `handoff_attempts` | New table |
| `food_orders.requested_time` | Add column |
| `food_orders.address_json` | Add column |
| `food_orders.totals_estimate` | Add column |
| `food_orders.handoff_state` | Add column |
| `order_status` enum | Add 'needs_followup' value |

---

## Implementation Order

1. **Database Migration** - Create tables and columns
2. **useFoodMode hook** - Simple utility first
3. **FoodOrderSettings component** - Settings UI
4. **Update SettingsPage** - Add Food tab
5. **OrderTicket component** - Print formatting
6. **OrderDetailsDrawer** - Full order view
7. **Update OrdersPage** - Integrate drawer and print
8. **order-handoff edge function** - Backend delivery
9. **Update elevenlabs-webhook** - Order creation from AI
10. **Testing** - Verify food vs non-food tenant behavior
