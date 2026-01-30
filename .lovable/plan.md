

# Fix Calendar OAuth Flow UX

## Problems to Fix

1. **Raw JSON data shown in popup** — After OAuth, the popup displays raw calendar data like `[{"id":"abc@group.v.calendar.google.com","name":"Holidays..."...}]`. This is unprofessional.

2. **Button stays spinning** — The `postMessage` isn't reliably received by the main window, so the "Connect" button never stops spinning.

3. **No calendar selection step** — User should explicitly choose which calendar(s) the AI can access, not just see a success message.

## Solution

### 1. Clean Up OAuth Callback Popup
**File:** `supabase/functions/calendar-oauth-callback/index.ts`

Update the success HTML to show a clean, professional message without any raw data:

```html
<!-- Current (broken) -->
<p>Found 5 calendar(s). This window will close automatically.</p>
<script>
  const calendars = ${JSON.stringify(calendars || [])};
  // This JSON gets shown as visible text sometimes
</script>

<!-- Fixed (clean) -->
<p>Connected successfully!</p>
<p>This window will close automatically.</p>
<script>
  // Data passed via postMessage only, never visible
</script>
```

### 2. Add Robust Connection Detection
**File:** `src/components/settings/CalendarConnectionWizard.tsx`

Add multiple layers of detection to ensure the UI updates:

**A) Focus-based detection:**
```tsx
useEffect(() => {
  if (!isConnecting || !selectedProvider) return;
  
  const handleFocus = async () => {
    await refetch();
    const newConn = connections.find(
      c => c.provider === selectedProvider && c.status === "connected"
    );
    if (newConn) {
      setIsConnecting(false);
      const cals = (newConn.config_json as any)?.available_calendars || [];
      setAvailableCalendars(cals);
      // Pre-select primary
      const primaryIds = cals.filter(c => c.primary).map(c => c.id);
      setSelectedCalendarIds(primaryIds.length ? primaryIds : cals.slice(0,1).map(c => c.id));
      setStep(2); // Go to calendar selection
    }
  };
  
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [isConnecting, selectedProvider, connections, refetch]);
```

**B) Polling fallback:**
```tsx
useEffect(() => {
  if (!isConnecting || !selectedProvider) return;
  
  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("provider", selectedProvider)
      .eq("status", "connected")
      .maybeSingle();
    
    if (data) {
      clearInterval(pollInterval);
      setIsConnecting(false);
      const cals = (data.config_json as any)?.available_calendars || [];
      setAvailableCalendars(cals);
      const primaryIds = cals.filter(c => c.primary).map(c => c.id);
      setSelectedCalendarIds(primaryIds.length ? primaryIds : cals.slice(0,1).map(c => c.id));
      await refetch();
      setStep(2);
    }
  }, 2000);
  
  // Timeout after 2 minutes
  const timeout = setTimeout(() => {
    clearInterval(pollInterval);
    if (isConnecting) {
      setIsConnecting(false);
      toast({ title: "Connection timed out", variant: "destructive" });
    }
  }, 120000);
  
  return () => {
    clearInterval(pollInterval);
    clearTimeout(timeout);
  };
}, [isConnecting, selectedProvider, toast, refetch]);
```

### 3. Keep Existing PostMessage Listener
The existing `handleMessage` listener already handles the success case — it just needs the polling/focus fallback as backup.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/calendar-oauth-callback/index.ts` | Clean up success HTML to hide raw JSON |
| `src/components/settings/CalendarConnectionWizard.tsx` | Add focus detection + polling fallback effects |

## End Result

After OAuth completes:
1. Popup shows clean "Connected successfully!" message (no raw data)
2. Popup closes automatically
3. Main window detects connection via polling (within 2 seconds) or focus event
4. Wizard advances to Step 2: "Select which calendars the AI can access"
5. User picks their calendar(s)
6. Proceeds to business hours and booking rules

