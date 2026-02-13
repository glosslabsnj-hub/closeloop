
# DreamDrive Auto Motors: Complete Sales Mode Fix

## Problems Identified

1. **AI tools not firing on calls** -- The ElevenLabs sales agent has 5 tools defined in code (`agentToolsConfig.ts`) but they must be **manually registered in the ElevenLabs dashboard** for each agent. Without that, the agent can't call `create_booking`, `check_availability`, etc. This is why nothing shows up on the calendar -- the agent literally cannot create bookings.

2. **No self-service inventory scraping** -- Business owners currently have no UI to add/manage their dealer URLs or trigger a scrape. You had to manually insert `dealer_urls` into `context_fields_json`. The Inventory page has no "Sync from website" button.

3. **Prospects tab still visible** -- The Customers page tab was already removed, but the memory note says it should be gone for sales mode. Looking at the code, the tab IS already removed (only "All", "Active", "Merge Queue" exist). If you're seeing "Prospects" somewhere, it may be a cached view or a different page. The sidebar and CRM page need checking.

4. **Dashboard not optimally configured post-onboarding** -- After onboarding, a sales tenant should see a dashboard that makes sense immediately: Inventory, Sales Pipeline, Test Drives, and relevant quick actions.

---

## Fix Plan (4 workstreams)

### Workstream 1: ElevenLabs Dashboard Tool Registration (MANUAL -- You Must Do This)

This is the root cause of bookings not appearing. The 5 sales agent tools must be registered in the ElevenLabs dashboard under the Sales agent:

| Tool Name | Endpoint URL | Key Params (LLM Prompt type) | Hidden Params (Dynamic Variable type) |
|-----------|-------------|------------------------------|--------------------------------------|
| `check_availability` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-availability` | date, time, service_name | tenant_id = `{{tenant_id}}`, conversation_id |
| `suggest_availability` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-suggest-availability` | date, service_name, preference | tenant_id = `{{tenant_id}}`, conversation_id |
| `create_booking` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-booking` | customer_name, date, time, service_name, notes | tenant_id = `{{tenant_id}}`, customer_phone = `{{caller_phone}}`, conversation_id |
| `check_service_area` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-service-area` | address | tenant_id = `{{tenant_id}}`, conversation_id |
| `create_callback` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-callback` | reason, customer_name, department, preferred_time, notes | tenant_id = `{{tenant_id}}`, customer_phone = `{{caller_phone}}`, conversation_id |

**Critical configuration detail**: `tenant_id` and `customer_phone` MUST be set as "Dynamic Variable" type using handlebars syntax. All other params (name, date, time, etc.) must be "LLM Prompt" type so the AI fills them from the conversation.

I cannot do this step for you -- it requires the ElevenLabs agent dashboard.

---

### Workstream 2: Self-Service Inventory Scraping UI

**Problem**: Business owners can't add their dealer URLs or trigger scrapes.

**Solution**: Add an "Import from Web" section to the Sales Inventory page.

#### Files to create:
- `src/components/inventory/InventorySyncPanel.tsx` -- A collapsible panel at the top of the Inventory page with:
  - Input field(s) for dealer page URLs (with add/remove)
  - "Sync Now" button that calls `scrape-carsforsale` edge function
  - Status indicator showing last sync time and result
  - Auto-saves URLs to `tenants.context_fields_json.dealer_urls`

#### Files to modify:
- `src/pages/app/SalesInventoryPage.tsx` -- Add the `InventorySyncPanel` above the inventory grid
- `src/hooks/useSalesInventory.ts` -- Add mutations for saving dealer URLs and triggering sync

#### How it works:
1. Owner enters their carsforsale.com (or other) dealer page URL
2. URL is saved to `context_fields_json.dealer_urls` on the tenant record
3. "Sync Now" button invokes the existing `scrape-carsforsale` edge function
4. Progress/result is displayed
5. The existing `cron-inventory-sync` continues to auto-refresh every 6 hours

---

### Workstream 3: Sales-Mode Dashboard Polish

**Problem**: Post-onboarding dashboard shows elements that don't make sense for a car dealership.

#### Files to modify:
- `src/pages/app/CustomersPage.tsx` -- For sales-mode tenants, hide the "Merge Queue" tab (not relevant) and relabel "Active" to "Buyers" using `useIndustryContext` terms
- `src/components/dashboard/layouts/SalesDashboardLayout.tsx` -- Add an "Inventory Summary" quick-stat card showing available vehicle count, and a "Sync Inventory" quick action linking to `/app/sales-inventory`

---

### Workstream 4: ElevenLabs Workflows Question

Regarding the ElevenLabs workflows video you watched -- **yes, workflows could help** but they solve a different problem. Workflows are for multi-step, branching conversation flows (like an IVR tree built visually). Your current architecture already handles this via:
- `twilio-inbound` IVR for hybrid tenants (press 1 for scheduling, 2 for dispatch)
- Capability-based tool injection
- Mode-specific system prompts

Workflows would be useful if you wanted to build complex branching logic *inside* ElevenLabs instead of in your code. For now, the tool-based approach is more flexible and keeps control in your codebase. The immediate priority is getting the 5 tools registered in the dashboard so bookings actually work.

---

## Implementation Order

1. **You (manual)**: Register the 5 tools in ElevenLabs Sales agent dashboard
2. **Code**: Build InventorySyncPanel for self-service scraping
3. **Code**: Polish SalesDashboardLayout with inventory stats
4. **Code**: Minor CustomersPage tweaks for sales mode
5. **Test**: Call DreamDrive, book a test drive, verify it appears on calendar

## Technical Details

### InventorySyncPanel Component
- Reads `dealer_urls` from tenant's `context_fields_json` via existing query pattern (see `FoodSettingsEditor.tsx` for the pattern)
- Saves URLs back using `supabase.from("tenants").update({ context_fields_json: { ...existing, dealer_urls: urls } })`
- Triggers scrape via `supabase.functions.invoke("scrape-carsforsale", { body: { tenant_id, dealer_urls, full_sync: true } })`
- Shows loading state during scrape (can take 30-60 seconds for large lots)
- Displays last sync timestamp from most recent `sales_inventory.updated_at`

### No database migrations needed
All data storage already exists (`sales_inventory` table, `context_fields_json` column, `scrape-carsforsale` function). This is purely a UI addition.
