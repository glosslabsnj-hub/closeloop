
# Make Integrations Actually Work

## Overview

The Integrations page currently has UI for connecting various tools, but most "Connect" buttons don't actually connect anything. This plan wires up the real OAuth flows and makes automations trigger correctly when enabled.

---

## Current State

| Integration | Current Status | After This |
|-------------|----------------|------------|
| Google Calendar | OAuth exists but not called from UI | Fully working |
| Google Sheets | Stub only | Real OAuth + append rows |
| Webhook | Works | Works (no change) |
| Printer | Sets flag only | PrintNode API or local print |
| Square, Calendly, Jobber | UI only | Concierge-only (with explanation) |
| SMS | Works via Twilio | Works (no change) |

---

## Changes

### 1. Fix Google Calendar Connect Button

**File: `src/components/integrations/IntegrationConnectDialog.tsx`**

The current dialog creates a database record but doesn't initiate the OAuth flow. We need to:

- Call `calendar-oauth-start` edge function for Google Calendar
- Open the OAuth popup window
- Listen for the `postMessage` from the callback
- Update connection status on success

```typescript
// When "Connect with Google" is clicked for google_calendar:
const response = await supabase.functions.invoke("calendar-oauth-start", {
  body: { provider: "google" }
});
const popup = window.open(response.data.auth_url, "_blank", "width=500,height=600");
// Listen for postMessage from callback
```

---

### 2. Add Google Sheets OAuth Integration

**New Files:**
- `supabase/functions/sheets-oauth-start/index.ts` 
- `supabase/functions/sheets-oauth-callback/index.ts`
- `supabase/functions/append-sheet-row/index.ts`

**Secrets Required:**
- `GOOGLE_SHEETS_CLIENT_ID`
- `GOOGLE_SHEETS_CLIENT_SECRET`
- `GOOGLE_SHEETS_REDIRECT_URI`

(Can reuse the same Google OAuth app as Calendar with additional scopes)

The flow:
1. User clicks "Connect Google Sheets"
2. OAuth popup opens with Sheets scopes
3. Callback stores tokens and creates integration record
4. When automation fires, call `append-sheet-row` with the data

---

### 3. Wire Up Printer Integration

**File: `supabase/functions/trigger-workflow/index.ts` (executePrintAction)**

Two options:

**Option A: PrintNode Integration (Cloud Printers)**
- Add `PRINTNODE_API_KEY` secret
- Call PrintNode API to submit print job
- Works with any PrintNode-connected printer

**Option B: Browser-Based Printing (Local)**
- Keep the `print_requested: true` flag approach
- Add a polling mechanism on the Orders page
- Auto-open print dialog when new orders arrive

Recommend Option A for reliability, with Option B as fallback.

---

### 4. Mark Unsupported Integrations as "Concierge Only"

**File: `src/pages/app/IntegrationsPage.tsx`**

For Square, Calendly, Jobber - these require complex OAuth or proprietary APIs:

- Change "Connect" button to "Request Setup"
- Opens the ConciergeRequestDialog instead
- Add a tooltip explaining why

```typescript
const CONCIERGE_ONLY = ["square", "calendly", "jobber"];

// In the UI:
{CONCIERGE_ONLY.includes(tool.id) ? (
  <Button onClick={() => setConciergeOpen(true)}>
    Request Setup
  </Button>
) : (
  <Button onClick={() => handleConnect(tool.id)}>
    Connect
  </Button>
)}
```

---

### 5. Update IntegrationConnectDialog for Real OAuth

**File: `src/components/integrations/IntegrationConnectDialog.tsx`**

Complete rewrite of the connect flow:

```typescript
const handleConnect = async () => {
  if (providerId === "google_calendar") {
    // Call calendar-oauth-start
    const { data, error } = await supabase.functions.invoke("calendar-oauth-start", {
      body: { provider: "google" }
    });
    if (data?.auth_url) {
      const popup = window.open(data.auth_url, "oauth", "width=500,height=600");
      // Listen for completion
      window.addEventListener("message", handleOAuthMessage);
    }
  } else if (providerId === "google_sheets") {
    // Similar for Sheets
    const { data } = await supabase.functions.invoke("sheets-oauth-start", {
      body: { provider: "google" }
    });
    // ...
  } else if (providerId === "webhook") {
    // Just save URL config
    await createIntegration.mutateAsync({...});
  } else if (providerId === "printer") {
    // Show PrintNode API key input or local mode selection
  }
};
```

---

### 6. Fix Automation Rules Triggering Calendar Events

**File: `supabase/functions/trigger-workflow/index.ts` (executeCalendarAction)**

Currently returns `simulated: true`. Update to:

1. Look up the tenant's `calendar_connections` and `calendar_tokens`
2. Refresh token if expired
3. Call Google Calendar API to create event
4. Return the created event ID

```typescript
async function executeCalendarAction(...) {
  // Get calendar connection and tokens
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", "google")
    .eq("status", "active")
    .single();

  if (!connection) {
    return { success: false, error: "No calendar connected" };
  }

  // Get tokens, refresh if needed
  // ... (reuse logic from create-calendar-event)

  // Create event via Google API
  const event = await createGoogleEvent(accessToken, calendarId, eventDetails);
  return { success: true, response: { event_id: event.id } };
}
```

---

### 7. Fix Google Sheets Automation Action

**File: `supabase/functions/trigger-workflow/index.ts` (executeSheetsAction)**

Update from stub to real implementation:

1. Look up `integrations` table for google_sheets config
2. Get OAuth tokens (need new `sheets_tokens` table or reuse `calendar_tokens`)
3. Call Google Sheets API to append row

---

## Implementation Order

1. **IntegrationConnectDialog OAuth fix** - Makes Google Calendar actually connect
2. **executeCalendarAction fix** - Makes the automation actually work
3. **Concierge-only integrations** - Sets correct expectations
4. **Printer via PrintNode** - Adds real print capability
5. **Google Sheets OAuth + action** - Full Sheets integration

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/integrations/IntegrationConnectDialog.tsx` | Rewrite connect flow |
| `src/pages/app/IntegrationsPage.tsx` | Mark concierge-only tools |
| `supabase/functions/trigger-workflow/index.ts` | Fix calendar + sheets actions |
| `supabase/functions/append-sheet-row/index.ts` | NEW - Sheets API wrapper |
| `supabase/functions/print-receipt/index.ts` | NEW - PrintNode integration |
| `supabase/config.toml` | Add new function entries |

---

## Secrets Required

| Secret | Purpose |
|--------|---------|
| `GOOGLE_SHEETS_CLIENT_ID` | OAuth for Sheets (can reuse Calendar app) |
| `GOOGLE_SHEETS_CLIENT_SECRET` | OAuth for Sheets |
| `PRINTNODE_API_KEY` | Cloud printing (optional) |

---

## Testing Checklist

After implementation:

1. **Google Calendar Connect**
   - Click "Connect" on Google Calendar
   - OAuth popup opens with Google consent screen
   - After approving, popup closes and integration shows "Connected"
   - Enable "Push bookings to Google Calendar" automation
   - Create a test booking
   - Verify event appears in Google Calendar

2. **Google Sheets Connect**
   - Click "Connect" on Google Sheets
   - OAuth flow completes
   - Enable "Send leads to Google Sheets" automation
   - Complete a test call
   - Verify row appears in configured sheet

3. **Printer**
   - Configure PrintNode API key (or use local mode)
   - Enable "Print orders automatically"
   - Create test order
   - Verify print job sent to PrintNode (or print dialog opens)

4. **Webhook**
   - Enable a webhook automation
   - Enter a test URL (e.g., webhook.site)
   - Trigger the event
   - Verify data received at webhook URL

5. **Concierge-Only Tools**
   - Click "Request Setup" on Square/Calendly/Jobber
   - Concierge dialog opens
   - Submit creates a setup_request record

---

## Summary

This plan transforms the Integrations page from mostly-UI-stubs to real, working connections. The key changes are:

1. Hook up the OAuth flows that already exist (Calendar)
2. Create the missing OAuth flows (Sheets)
3. Make automation actions call real APIs instead of returning `simulated: true`
4. Set correct expectations for integrations that require concierge setup
5. Add PrintNode for cloud printing

After these changes, when a user clicks "Connect" on Google Calendar and enables the automation, confirmed bookings will actually appear in their calendar.
