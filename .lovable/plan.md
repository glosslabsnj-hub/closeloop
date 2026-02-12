
# Callback Lead Hub + Business Brain Clarity Fixes

## The Problems

### 1. Calls come in but there's no clear place to manage them
Right now, calls land in a generic "Calls" page that's designed around booking outcomes ("Booked" / "No Book" / "Thinking"). For a callback-only business like Smiles Auto Works, every call is a lead that needs follow-up -- but there's no way to:
- See which leads are high-value vs low-value
- Get notified (email/SMS) when a new callback request comes in
- Track whether someone actually called the customer back
- Sort by urgency or service type

The `create-callback` function even has a `// TODO: Trigger SMS/email notification via universal-delivery` comment -- notifications were planned but never built.

### 2. The Business Brain doesn't adapt to your business type
You've experienced this firsthand: sections that don't apply to your business are shown, sections you need are hidden, and there's no clear "here's what to configure for YOUR type of business." The Required Questions editor (where you'd configure what info the AI collects) is buried under Operations > Rules where nobody would think to look.

---

## What This Plan Does

### Part 1: Build a Callback Lead Hub

Replace the generic "Calls" page with a **Lead Hub** that makes sense for callback-only businesses:

**Lead Value Scoring** (automatic, based on extracted call data):
- **Hot** (red badge): Mentions urgency keywords ("ASAP", "broken down", "emergency"), or high-value services (engine, transmission)
- **Warm** (orange badge): Standard service request with complete info collected (name + phone + service details)
- **Cool** (blue badge): Quick questions, price shoppers, incomplete info

**New columns for callback businesses:**
| Column | Purpose |
|--------|---------|
| Lead Score | Hot / Warm / Cool badge |
| Service Needed | Extracted from call (e.g., "Turbo replacement") |
| Follow-up Status | New / Called Back / No Answer / Completed |
| Time Since Call | "23 min ago" -- creates urgency |

**Owner notification on every callback:**
- Wire up the existing `universal-delivery` function to handle `entity_type: "callback"`
- Send email + SMS to the business owner with: caller name, phone, what they need, and a one-tap "Call Back" link
- The `SoundManager` already plays a sound on new calls -- we'll add a toast notification with a "View Lead" button

### Part 2: Fix Business Brain Navigation for Callback-Only Businesses

**Move "Info to Collect" (Required Questions) to Training tab** so it's findable when you're setting up what the AI should ask.

**Hide irrelevant sections** when in callback-only mode:
- Calendar & Availability (you're not booking)
- Service Scheduling (you're not scheduling)
- Booking Delivery settings (no bookings to deliver)

**Add a "Callback Mode" setup checklist** in the Brain Hub that shows exactly what callback-only businesses need to configure:
1. Business info (name, hours, address)
2. Services you offer (so AI can talk about them)
3. What info to collect on calls
4. Owner notification preferences
5. FAQs (common caller questions)

---

## Technical Details

### Database Changes

**Add `lead_score` and `followup_status` to `ai_call_sessions`:**
```sql
ALTER TABLE ai_call_sessions 
  ADD COLUMN lead_score text DEFAULT 'warm' 
    CHECK (lead_score IN ('hot', 'warm', 'cool')),
  ADD COLUMN followup_status text DEFAULT 'new'
    CHECK (followup_status IN ('new', 'called_back', 'no_answer', 'completed', 'lost'));
```

**Add `"callback"` to `universal-delivery` entity types:**
Update the `DeliveryRequest` interface and add a callback notification template.

### Edge Function Changes

**`supabase/functions/universal-delivery/index.ts`:**
- Add `"callback"` to the `entity_type` union
- Add callback notification template that fetches the opportunity/call session and sends email + SMS to the tenant owner
- Template includes: caller name, phone number, service requested, callback time preference

**`supabase/functions/elevenlabs-webhook/index.ts`:**
- In `persistCallback()` -- already calls `universal-delivery`, just needs the delivery function to actually handle it (done above)
- Add lead scoring logic: scan `extracted_payload` for urgency keywords and service value to set `lead_score`

**`supabase/functions/elevenlabs-create-callback/index.ts`:**
- Replace the `// TODO` with an actual `universal-delivery` call (matching the pattern already used in the webhook's `persistCallback`)

### Frontend Changes

**`src/pages/app/CallsPage.tsx`:**
- Add lead score badge column (Hot/Warm/Cool with color coding)
- Add follow-up status column with dropdown to update (New -> Called Back -> Completed)
- Add "Time since call" column for urgency awareness
- Sort by lead_score (hot first) then by recency
- Add filter tabs: All / Hot / Needs Follow-up / Completed

**`src/components/notifications/SoundManager.tsx`:**
- Enhance the call notification toast to show caller name and service requested (from `extracted_payload`)
- Add "View Lead" button on the toast that navigates to the Calls page

**`src/components/brain/layout/tabSubSectionConfig.ts`:**
- Add `"required-questions"` to the Training tab's FAQ sub-section

**`src/config/brainSectionRegistry.ts`:**
- Update required-questions section to appear in Training tab
- Add visibility guard to hide calendar/booking sections when `ai_behavior_mode === "callback_only"`

**`src/pages/app/BusinessBrainPage.tsx`:**
- Add callback-mode setup checklist banner showing what's configured vs what's missing
- Hide irrelevant tab sections for callback-only businesses

### Deployment
- Redeploy: `universal-delivery`, `elevenlabs-webhook`, `elevenlabs-create-callback`
