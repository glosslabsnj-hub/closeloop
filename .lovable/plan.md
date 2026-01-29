
# Comprehensive Dashboard Review & Improvement Plan
## Ensuring Full Functionality Across All Business Modes + Easy Voice & SMS Setup

---

## Review Summary

After thoroughly analyzing the user dashboard across all business modes (service, dispatch, food, medical, general), I've identified both **working functionality** and **areas for improvement** to ensure seamless setup for both calls and SMS.

---

## Current State Assessment

### What's Working Well

| Component | Status | Notes |
|-----------|--------|-------|
| DashboardHeroCard | Working | Agent toggle fixed, metrics display real data |
| TodayQueueCard | Working | Mode-adaptive querying for each business type |
| QuickLinksCard | Working | Shows module-relevant navigation links |
| RecentActivityCard | Working | Fetches real calls and bookings |
| BusinessBrainStatusCard | Working | Shows AI readiness and pending knowledge |
| GoLiveChecklist | Working | Tracks setup progress |
| SetupWizard | Working | 4-step guided setup flow |
| VoiceAgentTest | Working | Browser-based ElevenLabs WebRTC test |
| CarrierInstructions | Working | Clear forwarding instructions by carrier |
| Copilot | Working | Floating assistant |

### Business Mode Coverage

| Mode | Dashboard Cards | Queue Content | Quick Links |
|------|-----------------|---------------|-------------|
| Service | All working | Pending bookings | Bookings, Leads, Services |
| Dispatch | All working | Pending/urgent jobs | Dispatch, Leads |
| Food | All working | Active orders | Orders, Menu, Reservations |
| Medical | All working | Pending intakes | Intakes, Bookings |
| General | All working | No specific queue | Inbox, Leads |

---

## Issues Found

### Issue 1: Toggle Logic Discrepancy for SMS-Only Plans (Medium Priority)

**Location:** `DashboardHeroCard.tsx` lines 91-108

**Problem:** When a user has an SMS-only plan (no voice), the toggle correctly updates `instant_text_enabled`, but the **display logic** for `isAnyActive` doesn't properly account for this because it checks:

```typescript
const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
const smsEnabled = assistantSettings?.instant_text_enabled || false;
const isAnyActive = voiceEnabled || smsEnabled;
```

This works, BUT the messaging says "Answering calls for..." even when only SMS is active. This is confusing for SMS-only users.

**Fix:** Dynamic messaging based on plan capabilities.

---

### Issue 2: SetupWizard Step Navigation Bug (Low Priority)

**Location:** `SetupWizard.tsx` lines 42-44

**Problem:** The `activeStep` state and `currentStep` calculation are separate, causing potential desync:
- `activeStep` is user-controlled via `setActiveStep`
- `currentStep` is computed from `firstIncompleteIndex`

When user clicks on a step icon, `activeStep` changes but the render uses `currentStep` for content display.

**Fix:** Use a unified controlled state or ensure `currentStep` always respects `activeStep` when explicitly set.

---

### Issue 3: Phone Connection Step Shows Mock Number (High Priority)

**Location:** `PhoneConnectionStep.tsx` line 41-47, `ConnectPhoneDialog.tsx` line 39

**Problem:** The `closeloopNumber` is correctly sourced from `assistantSettings?.forwarding_phone_e164` or `assistantSettings?.closeloop_number`, but `ConnectPhoneDialog.tsx` still uses a **hardcoded mock number** on line 39:

```typescript
const closeloopForwardingNumber = "+1 (555) 123-4567";
```

This means the forwarding instructions in the dialog show fake numbers instead of the actual provisioned Twilio number.

**Fix:** Pass the real provisioned number to the dialog or fetch from assistant settings.

---

### Issue 4: Calendar Step Missing Skip Persistence (Medium Priority)

**Location:** `CalendarConnectionStep.tsx` lines 140-164

**Problem:** When a user clicks "Skip for now", it correctly sets `setup_step_calendar: true`, but the **SetupWizard's `handleCalendarSkip`** only calls `setActiveStep(2)` without waiting for the save to complete. This could cause a race condition.

**Fix:** Make `onSkip` async and await the save operation.

---

### Issue 5: SMS-Only Plan Missing Instant-Text Guidance (High Priority)

**Location:** `PhoneConnectionStep.tsx`, `GoLiveStep.tsx`

**Problem:** For SMS-only plans, the setup wizard still focuses heavily on "answering calls" language, which is confusing. SMS-only customers need guidance on:
1. How missed calls trigger instant text-back
2. Configuring the text-back delay
3. What the text messages will say

**Fix:** Add plan-aware messaging throughout the setup flow.

---

### Issue 6: TestAIStep Missing SMS Test Option (Medium Priority)

**Location:** `TestAIStep.tsx`

**Problem:** The "Test AI" step only shows:
- Browser voice test (WebRTC)
- Call my phone test

For SMS-only customers, neither of these is relevant. There should be an SMS test option.

**Fix:** Add an SMS test tab that uses the SMS simulator or sends a real test text.

---

### Issue 7: GoLiveStep Missing Plan-Specific Confirmation (Low Priority)

**Location:** `GoLiveStep.tsx` lines 151-172

**Problem:** The "What happens when you go live" section shows:
- Answer calls you miss (voice)
- Send instant texts (sms)
- Direct customers to book appointments
- Work 24/7

This is correct but could be more targeted. SMS-only plans shouldn't prominently show "Answer calls" as the first item.

**Fix:** Filter the features list based on plan capabilities.

---

## Improvement Plan

### Phase 1: Critical Fixes

#### 1.1 Fix ConnectPhoneDialog Mock Number

**File:** `src/components/dashboard/ConnectPhoneDialog.tsx`

Replace the hardcoded mock number with the real provisioned number from assistant settings:

```typescript
// Line 39: Change from
const closeloopForwardingNumber = "+1 (555) 123-4567";

// To: Get from currentSettings prop
const closeloopForwardingNumber = currentSettings?.forwarding_phone_e164 
  || currentSettings?.closeloop_number 
  || "(Pending provisioning)";
```

---

#### 1.2 Plan-Aware Messaging in DashboardHeroCard

**File:** `src/components/dashboard/DashboardHeroCard.tsx`

Update the status message to reflect actual capabilities:

```typescript
// Lines 230-236: Update the subtitle text
<p className="text-sm text-muted-foreground">
  {isAnyActive 
    ? hasVoice && hasSms
      ? `Answering calls and texts for ${tenant?.name || "your business"}`
      : hasVoice
        ? `Answering calls for ${tenant?.name || "your business"}`
        : `Sending instant text-backs for ${tenant?.name || "your business"}`
    : hasVoice 
      ? "Toggle to start answering calls"
      : "Toggle to enable instant text responses"
  }
</p>
```

Also update the icon in line 212:

```typescript
// Show SMS icon for SMS-only plans, Phone for voice plans
{hasVoice ? <Phone className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
```

---

#### 1.3 Add SMS Test to TestAIStep

**File:** `src/components/dashboard/TestAIStep.tsx`

Add a third tab for SMS testing (especially for SMS-only plans):

```typescript
// Add a new TabsTrigger
<TabsTrigger value="sms" className="gap-2">
  <MessageSquare className="h-4 w-4" />
  SMS Test
</TabsTrigger>

// Add TabsContent for SMS
<TabsContent value="sms" className="mt-4">
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Simulate an inbound SMS to see how your AI responds to text messages.
    </p>
    <SMSSimulator />
  </div>
</TabsContent>
```

Import SMSSimulator component and conditionally show based on plan.

---

### Phase 2: Setup Flow Improvements

#### 2.1 Fix SetupWizard Step Sync

**File:** `src/components/dashboard/SetupWizard.tsx`

Replace the dual-state logic with a unified approach:

```typescript
// Line 24: Use only activeStep, remove currentStep computation from render
const [activeStep, setActiveStep] = useState<number>(() => {
  // Initialize to first incomplete step
  const steps = [
    { isComplete: phoneComplete },
    { isComplete: calendarComplete },
    { isComplete: testComplete },
    { isComplete: goLiveComplete },
  ];
  const firstIncomplete = steps.findIndex(s => !s.isComplete);
  return firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
});

// Update activeStep when completion status changes
useEffect(() => {
  const firstIncompleteIndex = steps.findIndex(s => !s.isComplete);
  if (firstIncompleteIndex !== -1 && firstIncompleteIndex > activeStep) {
    // Don't auto-advance if user manually went back
  } else if (firstIncompleteIndex !== -1) {
    setActiveStep(firstIncompleteIndex);
  }
}, [phoneComplete, calendarComplete, testComplete, goLiveComplete]);

// Use activeStep for rendering instead of currentStep
```

---

#### 2.2 Plan-Aware GoLiveStep Features

**File:** `src/components/dashboard/GoLiveStep.tsx`

Filter the feature list based on plan:

```typescript
// Get plan info from context or props
const { subscription } = useAuth();
const planCode = subscription?.plan_code as string;
const hasVoice = planCode?.startsWith("voice") || planCode?.startsWith("both");
const hasSms = planCode?.startsWith("sms") || planCode?.startsWith("both");

// Filter features
const features = [
  hasVoice && { icon: Phone, text: "Answer calls you miss or can't take" },
  hasSms && { icon: MessageSquare, text: "Send instant texts to missed callers" },
  { icon: Calendar, text: "Direct customers to book appointments" },
  { icon: Shield, text: "Work 24/7, even when you're closed" },
].filter(Boolean);
```

---

### Phase 3: UI/UX Polish

#### 3.1 SMS-Specific Setup Guidance

For SMS-only plans, add a step explaining:
1. How call forwarding works with SMS text-back
2. Configurable delay (0-120 seconds)
3. What the auto-response messages contain

This would be in `PhoneConnectionStep.tsx` when detecting an SMS-only plan.

---

#### 3.2 Industry-Specific Dashboard Hints

Add subtle contextual hints in the dashboard based on business mode:

| Mode | Dashboard Hint |
|------|----------------|
| Food | "Pro tip: Add menu items to help AI answer food questions" |
| Dispatch | "Urgent jobs are highlighted in red in your queue" |
| Medical | "HIPAA mode is enabled - recordings are not stored" |
| Service | "Add your services and pricing to improve bookings" |

This would be a small banner or tooltip in the LiveDashboard component.

---

## File Changes Summary

### Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/components/dashboard/ConnectPhoneDialog.tsx` | Fix hardcoded mock number | High |
| `src/components/dashboard/DashboardHeroCard.tsx` | Plan-aware messaging | High |
| `src/components/dashboard/TestAIStep.tsx` | Add SMS test tab | Medium |
| `src/components/dashboard/SetupWizard.tsx` | Fix step sync logic | Medium |
| `src/components/dashboard/GoLiveStep.tsx` | Plan-aware features | Low |
| `src/components/dashboard/PhoneConnectionStep.tsx` | SMS-specific guidance | Low |

---

## Testing Checklist

After implementation, verify these flows work end-to-end:

### Voice Plan Setup
1. Select Voice or Both plan on GoLive page
2. Twilio number is provisioned
3. PhoneConnectionStep shows real Twilio number
4. CarrierInstructions display correct forwarding number
5. VoiceAgentTest connects to ElevenLabs
6. Toggle AI on dashboard enables `go_live_enabled` + `voice_ai_enabled`
7. Real calls forward to Twilio and ElevenLabs answers

### SMS Plan Setup
1. Select SMS plan on GoLive page
2. PhoneConnectionStep shows forwarding guidance
3. TestAIStep has SMS test option
4. Toggle AI on dashboard enables `instant_text_enabled`
5. Dashboard shows "Sending instant text-backs" message

### Mode-Specific Testing
1. Service mode: TodayQueueCard shows pending bookings
2. Dispatch mode: TodayQueueCard shows pending/urgent jobs
3. Food mode: TodayQueueCard shows active orders
4. Medical mode: TodayQueueCard shows pending intakes + HIPAA badge

---

## Dependencies

All changes are frontend-only. No database migrations or edge function changes required.

---

## Result

After implementation:
- All business modes display correct mode-specific content
- Voice and SMS setup flows are clear and distinct
- No hardcoded mock data in production UI
- Toggle behavior matches plan capabilities
- Test options available for both voice and SMS
- Setup wizard step navigation is reliable
