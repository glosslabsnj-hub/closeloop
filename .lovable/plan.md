

# Dashboard Reconfiguration Plan

## Overview

Transform the current dashboard into a **setup-first experience** that guides non-technical business owners through getting their AI agent running smoothly. The new dashboard will prioritize clarity, eliminate confusion, and make the path to "AI is live and booking appointments" unmistakable.

---

## Current State Analysis

The existing dashboard shows:
- A setup checklist (hidden when complete)
- Demo metrics and revenue banners
- Recent activity and quick actions

**Problems identified:**
1. Setup checklist is buried and not prominent enough
2. Phone connection flow is confusing (forwarding instructions unclear)
3. No calendar integration support
4. Agent status is not immediately visible
5. Too much demo data shown before the user is even set up
6. The Quick Setup Wizard in Simulator is disconnected from the main dashboard

---

## Proposed Dashboard Structure

### New Layout: Three-Phase Experience

**Phase 1: Incomplete Setup** - Full-screen setup wizard with progress tracking
**Phase 2: Setup Complete but Not Live** - Dashboard with prominent "Go Live" CTA
**Phase 3: Fully Live** - Performance metrics with agent status header

---

## Component Architecture

### 1. New Command Center Component
A prominent status banner at the top of the dashboard showing:
- Agent Status (Live/Offline/Needs Attention)
- Connection Health (Phone, Calendar)
- Quick test button
- One-click toggle to enable/disable AI

### 2. Redesigned Setup Flow
Replace the checklist with a **visual step-by-step wizard**:

```text
+-------------------------------------------------------------+
|  Get Your AI Running                                    3/4  |
|  =========================================================  |
|  [1. Phone] --> [2. Calendar] --> [3. Test AI] --> [4. Go Live]  |
|       Done          Active          Locked           Locked     |
+-------------------------------------------------------------+
```

### 3. Setup Steps Detail

**Step 1: Connect Your Business Phone**
- Two clear options with radio selection:
  - "Get a new CloseLoop number" (provisions via Twilio - mock for now)
  - "Use my existing number" (shows forwarding instructions)
- Phone number input field
- Visual confirmation when connected
- Provider-specific forwarding instructions (ATT, Verizon, T-Mobile, etc.)

**Step 2: Connect Your Calendar**
- Universal booking link option (Calendly, Cal.com, Acuity, etc.)
- Paste booking URL field
- Future: OAuth buttons for Google Calendar, Outlook, Apple Calendar
- Explanation of what AI can do: "Your AI will direct customers to book here"

**Step 3: Test Your AI**
- Browser-based voice test (existing VoiceAgentTest component)
- "Call My Phone" option (existing functionality)
- Preview of what customers will hear
- System prompt preview showing business context

**Step 4: Go Live**
- Big toggle switch
- Confirmation modal
- Success celebration animation

### 4. Post-Setup Dashboard
Once live, show:
- Agent Status Card (prominent, top of page)
- Key Metrics (calls handled, bookings made, texts sent)
- Recent Activity Feed
- Quick Actions

---

## Database Changes

Add new columns to `assistant_settings`:
```sql
-- Booking calendar URL (universal approach)
booking_url TEXT,
-- Calendar provider (for future OAuth integrations)
calendar_provider TEXT, -- 'google', 'outlook', 'apple', 'calendly', 'acuity', 'cal_com', 'other'
-- Track setup completion
setup_completed_at TIMESTAMP,
-- Track individual setup step completion
setup_step_phone BOOLEAN DEFAULT false,
setup_step_calendar BOOLEAN DEFAULT false,
setup_step_tested BOOLEAN DEFAULT false,
-- Phone provisioning method
phone_method TEXT -- 'closeloop_number' or 'forwarded'
```

---

## New Components to Create

1. **`src/components/dashboard/AgentStatusBanner.tsx`**
   - Shows AI online/offline status
   - Connection health indicators
   - Quick test button
   - Go Live toggle

2. **`src/components/dashboard/SetupWizard.tsx`**
   - Full-screen setup experience
   - Step-by-step progress
   - Replaces old SetupChecklist

3. **`src/components/dashboard/PhoneConnectionStep.tsx`**
   - Dual-option phone setup
   - Provider-specific instructions
   - Number verification

4. **`src/components/dashboard/CalendarConnectionStep.tsx`**
   - Booking URL input
   - Provider selection
   - Future OAuth integration points

5. **`src/components/dashboard/TestAIStep.tsx`**
   - Integrated voice test
   - Call-my-phone option
   - System prompt preview

6. **`src/components/dashboard/GoLiveStep.tsx`**
   - Final confirmation
   - Toggle with celebration

7. **`src/components/dashboard/LiveDashboard.tsx`**
   - Post-setup metrics view
   - Agent status
   - Activity feed

---

## Updated Page Flow

```text
DashboardPage.tsx
├── isSetupComplete?
│   ├── NO: <SetupWizard />
│   │   ├── Step 1: <PhoneConnectionStep />
│   │   ├── Step 2: <CalendarConnectionStep />
│   │   ├── Step 3: <TestAIStep />
│   │   └── Step 4: <GoLiveStep />
│   │
│   └── YES: <LiveDashboard />
│       ├── <AgentStatusBanner />
│       ├── <MetricsGrid />
│       └── <ActivityFeed />
```

---

## UX Improvements

1. **Progress Persistence**: Each step saves to database immediately
2. **Skip Options**: Non-critical steps can be skipped with clear warning
3. **Help Text**: Every field has simple, jargon-free explanations
4. **Mobile-First**: Full functionality on phone screens
5. **Error Recovery**: Clear messages when something fails
6. **Celebration Moments**: Confetti or animation when going live

---

## Phone Carrier Instructions

Include expandable sections with specific instructions for:
- Verizon: `*72 + forwarding number`
- AT&T: `*21*number#`
- T-Mobile: `**21*number#`
- Sprint: `*72 + number`
- Generic: Settings > Phone > Call Forwarding

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/SetupWizard.tsx` | Main wizard container |
| `src/components/dashboard/AgentStatusBanner.tsx` | Status display |
| `src/components/dashboard/PhoneConnectionStep.tsx` | Phone setup step |
| `src/components/dashboard/CalendarConnectionStep.tsx` | Calendar connection |
| `src/components/dashboard/TestAIStep.tsx` | AI testing step |
| `src/components/dashboard/GoLiveStep.tsx` | Final activation |
| `src/components/dashboard/LiveDashboard.tsx` | Post-setup view |
| `src/components/dashboard/CarrierInstructions.tsx` | Forwarding help |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/app/DashboardPage.tsx` | Complete rewrite with new flow |
| `src/components/dashboard/SetupChecklist.tsx` | Archive or remove |
| `src/components/dashboard/ConnectPhoneDialog.tsx` | Enhance with dual options |

### Database Migration

```sql
-- Add calendar and setup tracking to assistant_settings
ALTER TABLE assistant_settings 
ADD COLUMN IF NOT EXISTS booking_url TEXT,
ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS setup_step_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_step_calendar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_step_tested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_method TEXT;
```

---

## Implementation Order

1. **Database migration** - Add new columns
2. **PhoneConnectionStep** - Enhanced phone setup with dual options
3. **CalendarConnectionStep** - Booking URL capture
4. **TestAIStep** - Integrate existing voice test
5. **GoLiveStep** - Activation with toggle
6. **SetupWizard** - Container with step navigation
7. **AgentStatusBanner** - Status display component
8. **LiveDashboard** - Post-setup metrics
9. **DashboardPage rewrite** - Tie everything together
10. **Mobile optimization pass** - Ensure great mobile UX

---

## Success Metrics

After implementation, users should be able to:
- Complete full setup in under 5 minutes
- Understand exactly what each step requires
- Test their AI before going live
- See clear status of their agent at a glance
- Connect their booking calendar easily
- Know their phone is properly connected

