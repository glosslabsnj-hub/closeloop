
# Booking Calendar Sync + Voice Agent Delay Fix

## Summary
This plan addresses two critical issues:
1. **Booking Calendar Sync**: Appointments booked via AI don't appear in the web calendar or push to Google Calendar
2. **Voice Agent Delay**: Multi-second pauses between user speech and AI response make conversations feel unnatural

---

## Part 1: Booking Calendar Sync

### Current State Analysis

**Web Application Calendar:**
- The `useScheduleData` hook fetches bookings correctly from the `bookings` table
- However, there's no realtime subscription - the calendar only updates on manual refresh or page navigation
- After an AI books an appointment, the user won't see it until they refresh the page

**Google Calendar Push:**
- **Critical Finding**: There is NO existing logic to push bookings to Google Calendar
- The system only READS from Google (via `sync-availability`) but never WRITES
- The workflow system has a `create_calendar_event` node type defined in migrations but NOT implemented in `trigger-workflow/index.ts`

### Solution

**1. Add Realtime Subscription for Bookings**

Enable realtime on the `bookings` table so the calendar updates instantly when AI creates appointments.

```text
Database: ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
Frontend: Subscribe to changes in useScheduleData hook
```

**2. Implement Google Calendar Event Creation**

Create a new edge function `create-calendar-event` that:
- Uses the stored OAuth tokens from `calendar_connections`
- Creates events via Google Calendar Events API
- Returns the event ID for reference

**3. Auto-trigger Calendar Sync on Booking**

Update the booking workflow to automatically:
- Create a Google Calendar event when a booking is confirmed
- Store the external event ID for future updates/cancellations

---

## Part 2: Voice Agent Response Delay

### Current State Analysis

The voice agent uses ElevenLabs Conversational AI with:
- WebRTC connection via signed URL (browser tests)
- Twilio register-call for phone calls

**Potential Causes of Delay:**

1. **Large Dynamic Variables Payload**: The `buildBusinessContext` function builds an extensive context with services, FAQs, policies, hours, intent rules, and memory hints. This large payload is sent to ElevenLabs at connection time.

2. **WebSocket vs WebRTC**: Browser tests use `get-signed-url` (WebSocket), while phone calls use `register-call`. WebSocket has higher latency than WebRTC.

3. **Model/Voice Selection**: The ElevenLabs agent configuration (managed externally) determines response latency. Turbo models are faster.

4. **No Streaming Configuration**: The current implementation may not be optimized for low-latency conversational mode.

### Solution

**1. Optimize Dynamic Variables Payload**

Reduce the size of dynamic variables by:
- Truncating summaries to essential info (first 500 chars)
- Removing redundant fields
- Only including high-priority knowledge

**2. Use WebRTC for Lower Latency**

For browser tests, switch from `get-signed-url` (WebSocket) to `conversation-token` (WebRTC) endpoint which has lower latency.

**3. Add Latency Logging**

Add timing measurements to identify bottlenecks:
- Time to build context
- Time to get signed URL
- Time to first audio

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/create-calendar-event/index.ts` | Push bookings to Google Calendar |

### Files to Edit

| File | Change |
|------|--------|
| `src/hooks/useScheduleData.ts` | Add realtime subscription for instant updates |
| `src/hooks/useBookings.ts` | Add realtime subscription |
| `supabase/functions/booking-handoff/index.ts` | Trigger calendar event creation |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Switch to WebRTC token, optimize payload |
| `supabase/functions/_shared/buildBusinessContext.ts` | Add truncation for voice channel |

### Database Migration

Enable realtime on bookings table:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
```

---

## Implementation Details

### 1. Realtime Calendar Updates

The `useScheduleData` hook will subscribe to booking changes:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('schedule-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'bookings' },
      () => refetch()
    )
    .subscribe();
  
  return () => { supabase.removeChannel(channel); };
}, []);
```

### 2. Google Calendar Event Creation

New edge function flow:
1. Receive booking ID and tenant ID
2. Fetch booking details (time, service, customer)
3. Get calendar connection with OAuth tokens
4. Refresh access token if expired
5. POST to Google Calendar Events API
6. Store event ID back on booking record

API endpoint used:
```text
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

### 3. Voice Latency Optimization

**Payload Size Reduction:**
- `services_pricing`: Truncate to 500 chars
- `menu_summary`: Truncate to 400 chars
- `faqs_summary`: Keep only first 5 FAQs
- Remove `objections` from voice channel (text-only)

**Connection Type:**
- Browser tests will use `conversationToken` (WebRTC) instead of `signedUrl` (WebSocket)
- WebRTC typically has 50-100ms lower round-trip latency

---

## Architecture Diagram

```text
BOOKING SYNC FLOW:
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ AI Books    │───>│ bookings     │───>│ Realtime Event  │
│ Appointment │    │ table INSERT │    │ to Frontend     │
└─────────────┘    └──────────────┘    └─────────────────┘
                          │
                          ▼
               ┌────────────────────┐
               │ booking-handoff    │
               └────────────────────┘
                          │
                          ▼
               ┌────────────────────┐    ┌─────────────────┐
               │ create-calendar-   │───>│ Google Calendar │
               │ event              │    │ Events API      │
               └────────────────────┘    └─────────────────┘
```

---

## Expected Outcomes

1. **Calendar Updates Instantly**: When AI books an appointment, the web calendar shows it within 1-2 seconds (no page refresh needed)

2. **Google Calendar Sync**: Confirmed bookings automatically appear in the owner's connected Google Calendar

3. **Faster Voice Responses**: Reduced payload size and WebRTC connection should decrease response latency by 100-300ms

4. **Better Debugging**: Latency logs will help identify if further optimization is needed on the ElevenLabs agent configuration side

---

## Notes on Voice Delay

The voice response delay could also be caused by:
- **ElevenLabs Agent Configuration**: Model selection (turbo vs standard), voice settings, and LLM backend are configured in the ElevenLabs dashboard
- **Network Conditions**: Variable latency between user's device and ElevenLabs servers
- **Prompt Complexity**: Very long system prompts increase processing time

If delay persists after these optimizations, you may need to review the ElevenLabs agent settings in their dashboard (voice model, LLM selection, etc.).
