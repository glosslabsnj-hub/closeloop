
# Fix Sales Mode: Bookings, Calendar, Dashboard, and Pipeline

## Problems Found

### 1. Bookings Never Actually Created (Critical)
The AI agent told your test caller "you're all set for tomorrow at 3 PM" but **never called the `create_booking` tool**. Zero logs exist for the `elevenlabs-create-booking` edge function. The tools (check_availability, suggest_availability, create_booking, etc.) must be configured as **Custom Tools in the ElevenLabs agent dashboard** with the correct endpoint URLs. The code generates tool configs but they aren't automatically pushed to ElevenLabs -- they need to be manually added there.

**What needs to happen:**
- Provide you with the exact tool configurations (URLs, parameters) to paste into ElevenLabs Custom Tools
- OR build a tool-sync mechanism that auto-registers tools

### 2. `test_drives` Table Does Not Exist
The frontend has a `TestDrivesPage` and `useTestDrives` hook that query a `test_drives` table, but **this table was never created in the database**. Nothing can show up because the table doesn't exist.

**Fix:** Create the `test_drives` table with proper columns and RLS policies.

### 3. No "0 Hours" / "No Minimum" Option for Lead Time
Both the `BookingPoliciesEditor` and `CalendarConnectionWizard` start at 1 hour minimum notice. Your client wants no minimum notice required.

**Fix:** Add `{ value: 0, label: "No minimum" }` to both dropdowns.

### 4. Calendar Wizard Broken for Internal-Only Use
Your client doesn't want to connect an external calendar (Google/Microsoft). Currently:
- The wizard creates "manual" calendar connections that immediately error with "No tokens found" when synced
- Step 6 (Test Sync) fails because it tries to sync an external calendar that doesn't exist
- There are 4 calendar_connection records for this tenant, 3 in error state

**Fix:** Add an "Internal Only" path in the calendar wizard that:
- Skips the provider selection and OAuth steps
- Creates availability based on business hours alone
- Skips the "Test Sync" step (nothing to sync)
- Goes straight from booking rules to completion

### 5. Sales Dashboard Uses Wrong Layout
Sales mode (`case "sales"`) falls into `ServiceDashboardLayout`, which shows a calendar strip and "Quick Book" button. A used car dealership needs:
- Today's test drives / appointments
- Hot leads count
- Sales pipeline summary
- Quick action: "View Pipeline" or "View Test Drives"

**Fix:** Create a `SalesDashboardLayout` component tailored for dealerships.

### 6. Clean Up Broken Calendar Connection Records
There are 3 `calendar_connections` rows stuck in `status: error` for this tenant.

**Fix:** Delete the errored records as part of the migration.

---

## Implementation Plan

### Step 1: Database -- Create `test_drives` table and clean up
```sql
CREATE TABLE public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID,  -- references sales_inventory
  vehicle_description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  salesperson TEXT,
  notes TEXT,
  booking_id UUID,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY "Tenant users can view test drives"
  ON public.test_drives FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert test drives"
  ON public.test_drives FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update test drives"
  ON public.test_drives FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access to test drives"
  ON public.test_drives FOR ALL
  USING (auth.role() = 'service_role');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_drives;

-- Clean up broken calendar connections for this tenant
DELETE FROM public.calendar_connections 
  WHERE tenant_id = '59debf18-1276-4c10-ae1b-6194a531540c' 
  AND status = 'error';
```

### Step 2: Add "No minimum" option to booking rules
- `BookingPoliciesEditor.tsx`: Add `{ value: 0, label: 'No minimum' }` to `leadTimeOptions`
- `CalendarConnectionWizard.tsx`: Add `<option value={0}>No minimum</option>` to min lead hours dropdown

### Step 3: Fix Calendar Wizard for Internal-Only Path
Modify `CalendarConnectionWizard.tsx`:
- Add an "Internal Only" option in Step 1 (Provider selection): "I don't use an external calendar -- just manage availability in CloseLoop"
- When selected, skip Steps 2 (Connect) and 6 (Test Sync)
- Jump from Hours (Step 3) to Rules (Step 4) to Behavior (Step 5) to Done
- Save settings without creating a calendar_connection with "manual" provider that will just error

### Step 4: Create `SalesDashboardLayout`
New file: `src/components/dashboard/layouts/SalesDashboardLayout.tsx`
- Replace calendar strip with a "Today's Appointments / Test Drives" summary
- Quick action: "View Pipeline" linking to `/app/sales-pipeline`
- Show hot leads count
- Include ROI and Lead Recovery widgets

Update `ModeContentArea.tsx` to use `SalesDashboardLayout` for `case "sales"`.

### Step 5: Wire `elevenlabs-create-booking` to create test_drive records
In `elevenlabs-create-booking/index.ts`, after creating a booking for a sales-mode tenant:
- If the service_name/notes mention "test drive", also insert a `test_drives` record
- Link it to the booking and customer

### Step 6: Provide ElevenLabs Tool Configuration
Generate and display the exact Custom Tool configurations (URL, method, parameters) that need to be added to the ElevenLabs agent dashboard for Dream Drive Auto Motors. This is the **root cause** of bookings not working -- the agent has no tools registered.

---

## Technical Notes

- The `elevenlabs-create-booking` edge function code is correct and deployed -- the issue is that ElevenLabs doesn't know to call it because the tools aren't registered in the dashboard
- The `agentToolsConfig.ts` generates tool definitions programmatically but these are only used for prompt generation, not for actual ElevenLabs API registration
- For the Twilio path, tools must be configured as Custom Tools in the ElevenLabs Conversational AI dashboard, with the webhook URL pointing to the edge function endpoints
- The tenant's `ai_booking_mode` is already set to `auto_book`, so once tools are connected, bookings will auto-confirm
