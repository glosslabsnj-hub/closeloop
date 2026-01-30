
## What’s going on (root cause, based on the code + live behavior)

You’re seeing “2pm is available” + “nothing earlier” even though the dashboard schedule shows earlier open time because **the AI is not using a reliable, deterministic availability source** when it decides what times to offer, and the availability engine itself currently has **timezone + duration pitfalls** that can make “earliest slots” wrong.

There are three overlapping issues:

1) **Timezone bug in the availability engine (major)**
- `fn_compute_available_slots()` builds slots like `current_day + open_time` but **does not apply the tenant’s timezone**.
- For a tenant like “Elite Auto Detailing” in `America/Los_Angeles`, this produces slot timestamps that are effectively interpreted in the database/server timezone (typically UTC).
- Net effect: “tomorrow” and “earliest” can become misaligned versus what the calendar UI shows (which uses the browser’s local timezone when rendering `new Date(start_at)`).

2) **Service duration mismatch (very likely contributor)**
- Your “interior detail” service is 120 minutes in the database.
- If the AI is picking times assuming 60 minutes (or guessing), it may think an earlier slot works or doesn’t work incorrectly.
- Also, the user-facing schedule visually may look “open” earlier, but **not open for a full 2-hour block** once you account for the appointment duration + buffers.

3) **The voice agent isn’t guaranteed to actually “compute, filter, then answer”**
- ElevenLabs conversational agents don’t automatically call your backend unless you explicitly wire a tool/override flow.
- Right now, even with “Strict: only free slots” as a policy, the agent can still “reason” its way to a time and say it confidently unless we force it to:
  - query availability deterministically, and
  - only speak from the returned list.

## Goals (what “working” means)

1) When a caller asks “any availability tomorrow?” the agent responds with the true earliest options that fit:
- tenant business hours (in tenant timezone)
- busy blocks (Google + manual + holds + confirmed bookings)
- correct duration for the requested service (or explicitly asks which service first)

2) When a caller says “anything earlier?” the agent:
- re-queries and offers the true earliest earlier slots that fit the duration
- if none exist, explains why (e.g., “we don’t have a full 2-hour opening earlier”)

3) When a caller requests a specific time:
- the agent must call a real-time checker and only confirm if available
- otherwise it offers the nearest alternatives returned by backend

## Implementation approach

### A) Fix the underlying availability engine (timezone + duration + no side effects)

**A1. Replace “cleanup inside read” behavior**
- `fn_compute_available_slots` currently calls `cleanup_expired_holds()` which does an UPDATE.
- This is a side effect and makes the function unsuitable for “read-only” contexts and can create subtle inconsistencies.
- Instead, treat expired holds as inactive purely in queries:
  - Consider a hold conflicting only if `expires_at IS NULL OR expires_at > now()`.

**A2. Make slot generation timezone-aware**
- Update the database function to build slot boundaries in the tenant’s timezone, then return UTC timestamps.
- Pattern:
  - Build a “local timestamp” for each slot: `(current_day::timestamp + open_time)`
  - Convert to timestamptz using `AT TIME ZONE tenant_timezone`
  - Iterate in 30-minute increments in local time (or convert carefully to UTC after)
- Ensure the “date” inputs are interpreted as **local dates in tenant timezone**.

**A3. Incorporate buffers consistently**
- If tenant has `appointment_buffer_minutes`, treat the total blocked time as:
  - `duration_minutes + buffer_minutes`
- Ensure:
  - `fn_compute_available_slots` uses the correct buffer (defaulting to tenant config if not provided).
  - `check-availability` uses the same buffer logic when validating a requested slot (conflict checks must include the buffer).

**A4. (Optional but recommended) Add a deterministic “earliest slot” helper**
- Add a small DB function or backend function that returns:
  - earliest N slots for a given date range + duration
  - and can filter “before_time” / “after_time”
- This makes “anything earlier?” deterministic instead of LLM-guessing.

### B) Make the AI’s availability answers deterministic (strict mode enforcement)

We need to ensure the voice agent cannot “invent” availability.

**B1. Add/standardize backend endpoints to support the agent**
Create a minimal set of backend functions the agent can call:

1. `availability-suggest` (new)
   - Input: tenant_id, date (local), service_id OR duration_minutes, preference (earliest / earlier_than / later_than), reference_time (optional)
   - Output: ordered list of times (local display + UTC timestamps), plus an explanation if none

2. `check-availability` (already exists, but will be upgraded)
   - Must be timezone-correct and buffer-correct
   - Output should include: `available`, `conflict_reason`, `alternative_slots[]`

3. `book-appointment` (new, optional for now)
   - Input: tenant_id, customer details, service_id, start_time, etc.
   - Internals:
     - place hold (`fn_place_hold`)
     - confirm booking (`fn_confirm_booking`)
     - triggers existing booking handoff + Google event creation
   - Output: booking_id + confirmed times

**B2. Ensure the ElevenLabs agent is actually “seeing” strict rules**
Right now the canonical `systemPrompt` produced by `buildBusinessContext()` is not clearly being injected into the ElevenLabs session in a way that guarantees behavior.

We’ll update the conversation initiation payloads to include:
- `conversation_config_override.agent.prompt.prompt` = the canonical `systemPrompt` that includes strict rules
- Keep dynamic variables as well

This will be implemented in:
- `supabase/functions/twilio-inbound/index.ts` (register-call payload)
- `supabase/functions/elevenlabs-conversation-token/index.ts` (browser test payload)

**B3. Wire a real “tool call” path (so the agent can query availability)**
ElevenLabs supports tools + conversation overrides. We’ll implement one of these:

- Preferred: configure an ElevenLabs HTTP tool that calls our backend endpoints (availability-suggest, check-availability, book-appointment).
- Then ensure the agent is configured to use that tool for scheduling.

If the tool route is not feasible in your current ElevenLabs agent security settings, fallback:
- Inject a short, precomputed `tomorrow_slots` list (for multiple durations) into dynamic variables at conversation start.
- This is weaker (not truly real-time) but still prevents the worst hallucinations and immediately fixes “earlier than 2pm” in many cases.
- We’ll still pursue tools as the real fix.

### C) Fix Google Calendar write timezone (prevents “ghost conflicts”)

In `create-calendar-event`, timeZone is currently hardcoded to `"America/New_York"`.
- This can create calendar events at the wrong local time, which later sync back as busy blocks that “don’t match” what the business expects.

We will:
- Pull `tenant.timezone` and use it when writing `eventPayload.start.timeZone` and `eventPayload.end.timeZone`.

### D) Add “truth layer” debugging so you can see exactly why it picked a time

Add a small “Availability Debugger” panel accessible from the dashboard (Bookings page and/or AI debug tools) that shows:
- selected service + duration
- computed available slots for tomorrow
- busy blocks that are blocking earlier times
- the exact reason earlier times fail (e.g., “not enough contiguous time for 120 minutes”, “outside hours”, “buffer pushes it into conflict”)

This lets us diagnose issues in minutes instead of guessing.

## File-level change list (what will be edited/added)

Backend (Lovable Cloud functions):
- Edit: `supabase/functions/check-availability/index.ts` (timezone + buffer correctness; optionally call DB helper)
- Edit: `supabase/functions/compute-available-slots/index.ts` (ensure it uses tenant buffer defaults + returns local display)
- Edit: `supabase/functions/twilio-inbound/index.ts` (pass `conversation_config_override` prompt)
- Edit: `supabase/functions/elevenlabs-conversation-token/index.ts` (pass `conversation_config_override` prompt)
- Edit: `supabase/functions/create-calendar-event/index.ts` (use tenant timezone)
- Add: `supabase/functions/availability-suggest/index.ts` (deterministic slot selection + earlier/later constraints)
- Add (optional): `supabase/functions/book-appointment/index.ts` (hold + confirm booking atomically)

Database (migration):
- Edit/replace: `public.fn_compute_available_slots` to be timezone-aware and side-effect-free
- Edit: `public.fn_place_hold` conflict check to ignore expired holds without needing cleanup
- (Optional) Add: `public.fn_suggest_slots` / `public.fn_check_availability` for single-source-of-truth in SQL

Frontend:
- Add/Edit: a lightweight “Availability Debugger” component placed on `/app/bookings` (or inside existing debug pages) to call the backend and display:
  - available slots list (local)
  - blocking events list
  - selected service duration
  - a “why not earlier” explanation

## Test plan (how we’ll prove it’s fixed)

1) **Reproduce your exact complaint**
- Choose “Full Interior Detail” (120 min)
- Ask: “Any availability tomorrow?”
- Confirm the first suggested time matches the earliest true slot in the calendar UI.
- Ask: “Anything earlier?”
  - The agent must either:
    - offer earlier valid slots, or
    - explicitly say “No earlier openings for a full 2-hour interior detail” and show the nearest earlier time for shorter services if you want that behavior.

2) **Specific-time strict check**
- Ask: “Can I book tomorrow at 3 PM?”
- If the calendar is booked at 3 PM, agent must say it’s unavailable and offer alternatives.

3) **Timezone verification**
- Compare:
  - slots returned by backend (displayed in debugger)
  - slots visually open in the calendar UI
  They must line up in local time.

4) **End-to-end booking**
- Complete a booking via the AI.
- Verify it appears immediately in:
  - web schedule (realtime)
  - Google Calendar (correct local time)
  - and that it syncs back as a busy block if needed.

## One thing I need from you (in the next request)
When you say “earlier is available” — is that **for the same service (interior detail, 120 min)**, or do you mean “any 1-hour slot is available earlier”?
This determines whether we:
- show “earliest for the requested service duration”, or
- show multiple duration tiers (“earliest 1h”, “earliest 2h”, etc.).

(If you want, tell me the exact service name you used in the call and what you saw available earlier on the calendar.)

## Rollout strategy
- Implement the timezone-safe DB changes + upgraded `check-availability` first (fixes the correctness layer).
- Add the deterministic `availability-suggest` function + inject prompt override next (fixes “why did it say 2pm”).
- Finally, wire tool-based calls for the voice agent (fixes strict enforcement in real conversations).

If you want me to proceed, send a new request confirming whether “earlier availability” should be evaluated for the same service duration (and which service), and I’ll start implementing the above.
