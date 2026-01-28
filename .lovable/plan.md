
# Plan: Add Complete Industry-Specific Test Data

## Overview
When switching between business modes using the Admin Mode Switcher, the system needs to populate ALL industry-specific database tables with realistic test data - not just the common tables (services, FAQs, hours, calls). Each industry has unique operational tables that the AI and dashboard read from.

## Current State
The `AdminModeSwitcher.tsx` currently resets these tables:
- `tenants` (name, mode, modules)
- `services`
- `business_faqs`
- `ai_knowledge_base`
- `objection_responses`
- `availability_slots`
- `ai_call_sessions`

## Missing Industry-Specific Data

### Food Mode
- **menu_items**: Full restaurant menu with categories, prices, dietary tags
- **reservations**: Table reservations with party sizes and times
- **food_orders**: Takeout/delivery orders with item details
- **catering_requests**: Catering inquiries and quotes

### Dispatch Mode
- **dispatch_jobs**: Active and completed roadside jobs with locations, priorities, crews

### Medical Mode
- **medical_intakes**: Patient intake requests with urgency, consent, visit reasons

## Implementation Approach

### Step 1: Extend industryTestData.ts
Add new data arrays to each industry's test data object:

```text
INDUSTRY_TEST_DATA = {
  food: {
    ...existing fields,
    menuItems: [
      { name: "Margherita Pizza", category: "Pizza", price_cents: 1599, ... },
      { name: "Spaghetti Carbonara", category: "Pasta", price_cents: 1899, ... },
      ...
    ],
    reservations: [
      { customer_name: "John Smith", party_size: 4, date: "tomorrow 7pm", ... },
      ...
    ],
    orders: [
      { order_number: "ORD-001", type: "takeout", items: [...], total: 4250 },
      ...
    ],
    cateringRequests: [
      { customer_name: "ABC Corp", event_type: "corporate", guest_count: 50, ... },
      ...
    ]
  },
  dispatch: {
    ...existing fields,
    dispatchJobs: [
      { job_number: "JOB-001", priority: "urgent", pickup_address: "...", ... },
      ...
    ]
  },
  medical: {
    ...existing fields,
    medicalIntakes: [
      { intake_type: "new_patient", urgency: "routine", reason: "...", ... },
      ...
    ]
  }
}
```

### Step 2: Update AdminModeSwitcher.tsx - resetAllTestData function
Add cleanup and insertion for each industry-specific table:

```text
// For Food mode
if (mode === "food") {
  // Clear and insert menu items
  await supabase.from("menu_items").delete().eq("tenant_id", tenantId);
  await supabase.from("menu_items").insert(testData.menuItems);
  
  // Clear and insert reservations
  await supabase.from("reservations").delete().eq("tenant_id", tenantId);
  await supabase.from("reservations").insert(testData.reservations);
  
  // Clear and insert orders
  await supabase.from("food_orders").delete().eq("tenant_id", tenantId);
  await supabase.from("food_orders").insert(testData.orders);
  
  // Clear and insert catering requests
  await supabase.from("catering_requests").delete().eq("tenant_id", tenantId);
  await supabase.from("catering_requests").insert(testData.cateringRequests);
}

// For Dispatch mode
if (mode === "dispatch") {
  await supabase.from("dispatch_jobs").delete().eq("tenant_id", tenantId);
  await supabase.from("dispatch_jobs").insert(testData.dispatchJobs);
}

// For Medical mode
if (mode === "medical") {
  await supabase.from("medical_intakes").delete().eq("tenant_id", tenantId);
  await supabase.from("medical_intakes").insert(testData.medicalIntakes);
}
```

### Step 3: Clean Up Non-Applicable Data When Switching Away
When switching FROM an industry, clear that industry's specific tables:

```text
// Always clear industry-specific tables to avoid stale data
await supabase.from("menu_items").delete().eq("tenant_id", tenantId);
await supabase.from("reservations").delete().eq("tenant_id", tenantId);
await supabase.from("food_orders").delete().eq("tenant_id", tenantId);
await supabase.from("catering_requests").delete().eq("tenant_id", tenantId);
await supabase.from("dispatch_jobs").delete().eq("tenant_id", tenantId);
await supabase.from("medical_intakes").delete().eq("tenant_id", tenantId);

// Then only insert data for the new mode
```

## Test Data Details

### Food Mode - Bella Italia Ristorante

**Menu Items (12-15 items across categories):**
| Category | Item | Price | Dietary |
|----------|------|-------|---------|
| Appetizers | Bruschetta | $9.99 | V |
| Appetizers | Calamari Fritti | $14.99 | - |
| Pasta | Spaghetti Carbonara | $18.99 | - |
| Pasta | Fettuccine Alfredo | $16.99 | V |
| Pasta | Penne Arrabbiata | $15.99 | V, GF-available |
| Pizza | Margherita | $15.99 | V |
| Pizza | Pepperoni | $17.99 | - |
| Pizza | Quattro Formaggi | $18.99 | V |
| Entrees | Chicken Parmigiana | $22.99 | - |
| Entrees | Eggplant Parmigiana | $19.99 | V |
| Desserts | Tiramisu | $8.99 | V |
| Desserts | Cannoli | $6.99 | V |
| Drinks | House Wine (glass) | $9.00 | V, GF |

**Reservations (4 entries):**
- Smith party of 6, Friday 7:00 PM, anniversary dinner, confirmed
- Johnson party of 2, Saturday 6:30 PM, patio request, pending
- Williams party of 8, Sunday 1:00 PM, birthday, confirmed
- Davis party of 4, Today 8:00 PM, no preference, seated

**Food Orders (4 entries):**
- ORD-101: Takeout, 3 items, $42.50, preparing
- ORD-102: Delivery, 5 items, $68.75, out_for_delivery
- ORD-103: Takeout, 2 items, $35.00, ready
- ORD-104: Delivery, 4 items, $55.25, pending

**Catering Requests (2 entries):**
- Corporate lunch for 50, budget $1500, pending quote
- Wedding rehearsal for 30, Italian buffet, confirmed

### Dispatch Mode - City Roadside Rescue

**Dispatch Jobs (5 entries):**
| Job # | Priority | Type | Status | Location |
|-------|----------|------|--------|----------|
| JOB-1001 | Urgent | Flat Tire | en_route | Highway 101, Mile 42 |
| JOB-1002 | High | Jump Start | pending | 123 Main St, Downtown |
| JOB-1003 | Normal | Towing | assigned | 456 Oak Ave |
| JOB-1004 | Normal | Lockout | on_site | Mall Parking Lot B |
| JOB-1005 | Low | Scheduled Tow | completed | 789 Elm St |

### Medical Mode - Sunrise Family Medicine

**Medical Intakes (4 entries):**
| Type | Urgency | Reason | Status | Consent |
|------|---------|--------|--------|---------|
| new_patient | routine | Annual wellness check | pending | Yes |
| followup | soon | Lab results review | scheduled | Yes |
| new_patient | urgent | Persistent chest pain | pending | Yes |
| followup | routine | Medication refill | completed | Yes |

## Files to Modify

1. **src/data/industryTestData.ts**
   - Add `menuItems`, `reservations`, `orders`, `cateringRequests` to food mode
   - Add `dispatchJobs` to dispatch mode
   - Add `medicalIntakes` to medical mode
   - Update `IndustryTestData` interface

2. **src/components/admin/AdminModeSwitcher.tsx**
   - Update `resetAllTestData` function to:
     - Clear ALL industry-specific tables first
     - Insert mode-specific data based on selected industry

## Technical Notes

- Use consistent TEST_PHONES across all records to maintain customer linkage
- Generate realistic dates relative to "now" (today, tomorrow, yesterday)
- Include a mix of statuses (pending, active, completed) for realistic dashboards
- Ensure all required fields have valid data per table schemas
