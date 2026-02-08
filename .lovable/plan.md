
# Business Brain Setup Redesign Plan

## Executive Summary

The current Business Brain has **60+ configuration sections** spread across **8 tabs**, creating a confusing and overwhelming experience. Business owners don't know what's essential, what's optional, or how settings relate to each other. The goal is to create an experience where **any business, regardless of mode, can easily set up their AI to match their exact needs**.

---

## Core Problems Identified

### 1. Information Architecture Problems
- **Too many sections visible at once** - 8 tabs with nested cards create cognitive overload
- **No clear starting point** - New users don't know where to begin
- **Duplicate settings** - Same setting appears in multiple places (e.g., Order Settings, Distance Pricing)
- **Unclear dependencies** - When setting X affects setting Y, it's not obvious

### 2. Missing Guidance
- **No scenario-based questions** - System doesn't ask "Do you deliver?" before showing delivery zones
- **Generic labels** - "Services" means different things for different businesses
- **No AI preview during setup** - Owners can't see how their answers affect AI behavior
- **No validation feedback** - Owners don't know if their setup is actually working

### 3. Mode-Specific Gaps
- **Food mode**: Catering vs. regular orders need different flows
- **Dispatch mode**: Towing vs. Roadside vs. Impound are conflated
- **Service mode**: Mobile vs. shop-based have different needs
- **Medical mode**: Insurance/HIPAA complexity is buried

---

## Proposed Solution: "Guided Brain Setup"

A hybrid approach combining the best elements from our discussion:

### Phase 1: Smart Onboarding Interview (New)
Before dropping users into the current Business Brain, run a **focused 5-10 minute interview** that:
1. Asks scenario-based questions specific to their industry
2. Auto-populates the Business Brain fields
3. Shows real-time AI preview of their answers
4. Only asks what's relevant based on prior answers

### Phase 2: Simplified Business Brain (Redesigned)
After interview, the Business Brain becomes a **review and refine** interface:
1. Sections are pre-populated and collapsed by default
2. Clear status indicators show what's ready
3. "Test your AI" is prominent at all stages
4. Advanced options hidden until needed

---

## Detailed Design

### Smart Interview Flow

```text
Step 1: Business Identity (All Modes)
  - Business name
  - What makes you unique? (becomes tagline)
  - Business address
  - Timezone

Step 2: Operating Hours (All Modes)
  - Simple hours picker
  - "Same hours every day?" shortcut
  - After-hours handling preference

Step 3: What You Offer (Mode-Specific)
  - FOOD: Pickup/Delivery/Dine-in/Catering toggles + menu upload
  - DISPATCH: Towing/Roadside/Impound toggles + service list
  - SERVICE: Shop/Mobile/Both + service catalog
  - MEDICAL: Appointment types + insurance info
  - GENERAL: Service description

Step 4: Where You Serve (Conditional)
  - Only shown if delivery/mobile/dispatch is enabled
  - Map-based area selection
  - ETA preferences

Step 5: Policies & Rules (Mode-Specific)
  - Scenario questions: "Customer calls at 11 PM. What happens?"
  - Deposit/cancellation requirements
  - What should AI never promise?

Step 6: AI Personality
  - Greeting script preview with live AI demo
  - Tone selection (formal/friendly/casual)
  - "Things your AI should always mention"

Step 7: Test & Validate
  - Make a test call to your AI
  - See what gaps the AI identifies
  - Quick fix mode for any issues
```

### Interview Question Examples (By Mode)

**Towing/Dispatch:**
- "A customer calls at 2 AM needing a tow. Do you charge extra for after-hours?"
- "How long does it typically take your driver to arrive within your service area?"
- "If someone asks for a price, can you give exact quotes or estimates?"
- "Do you operate an impound lot? If yes, what are your storage rates?"

**Restaurant/Food:**
- "Do you offer delivery? What's your delivery radius?"
- "What's your typical food prep time during normal hours? During rush?"
- "Do you take reservations? How far in advance?"
- "Do you handle catering? What's the minimum order?"

**Service (Salon/Detailing/Cleaning):**
- "Do you travel to customers or do they come to you?"
- "Do you require deposits for appointments?"
- "What's your cancellation policy?"
- "How much buffer time do you need between appointments?"

**Medical:**
- "Do you offer telehealth visits?"
- "What insurance carriers do you accept?"
- "Are you a HIPAA-covered entity?"
- "Do you need to triage symptoms before booking?"

### Data Flow Architecture

```text
Interview Answer -> Field Mapping -> Business Brain Table

Example:
Q: "Do you charge extra for after-hours calls?"
A: "Yes, 1.5x after 6 PM"

Maps to:
- tenants.pricing_rules_jsonb.after_hours_multiplier = 1.5
- tenants.pricing_rules_jsonb.after_hours_start = "18:00"
- assistant_settings.policies.after_hours_guidance = "We have a 50% surcharge..."
```

### Simplified Business Brain (Post-Interview)

After the interview, the Business Brain shows:

**Dashboard View:**
- Large "Your AI is ready!" or "3 things to complete" banner
- Single-column list of **categories** (not individual sections)
- Each category shows: completion status, preview text, edit button
- "Test Your AI" button always visible

**Category Cards (Collapsed by Default):**
```
┌─────────────────────────────────────────────────┐
│ ✓ Business Identity                             │
│   "Mike's Auto Detailing - Mobile detailing..." │
│                                      [Edit →]   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ✓ Hours & Availability                          │
│   "Mon-Sat 8AM-6PM, Closed Sunday"              │
│                                      [Edit →]   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ! What You Offer                       [Key]    │
│   "5 services configured, no prices yet"        │
│                                      [Edit →]   │
└─────────────────────────────────────────────────┘
```

**Expanded Category View:**
When user clicks "Edit", they see:
1. Summary of what's configured
2. Section-by-section breakdown
3. AI Preview showing how the AI will use this info
4. "I'm done with this section" button

---

## Technical Implementation

### New Components

| Component | Purpose |
|-----------|---------|
| `BrainInterviewFlow` | Orchestrates the multi-step interview |
| `InterviewStep` | Renders a single step with questions |
| `ScenarioQuestion` | Presents a scenario with response options |
| `AIPreviewDemo` | Live preview of how AI will speak |
| `BrainDashboard` | New simplified view of Business Brain |
| `CategoryCard` | Collapsed summary of a section group |

### New Hooks

| Hook | Purpose |
|------|---------|
| `useInterviewState` | Manages interview progress and answers |
| `useInterviewToFields` | Maps answers to Business Brain fields |
| `useAIPreviewText` | Generates preview text from current config |

### Database Changes

None required - we're writing to existing tables:
- `tenants` - Core business info
- `services` - Offerings
- `assistant_settings` - AI configuration
- `food_order_settings` - Food-specific
- Etc.

### New Table (Optional Enhancement)

```sql
CREATE TABLE interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  question_key TEXT NOT NULL,
  response_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

This allows:
- Re-running interview later to update
- Tracking what questions were asked
- Improving question quality over time

---

## Migration Strategy

### For New Users
1. After onboarding, redirect to `/app/brain-setup` (new interview flow)
2. Interview takes ~10 minutes
3. After interview, redirect to Business Brain dashboard

### For Existing Users
1. Business Brain shows new dashboard view
2. "Improve Your Setup" button offers to run interview
3. Interview answers merge with existing config

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to AI-ready | Unknown | < 15 min |
| Completion rate (go-live) | ~40%? | > 80% |
| Support tickets about setup | High | -50% |
| Test calls made during setup | Low | > 90% |

---

## Implementation Phases

### Phase 1: Interview Engine (Week 1-2)
- Build `BrainInterviewFlow` component
- Create question bank for each mode
- Implement answer-to-field mapping
- Add basic AI preview

### Phase 2: Dashboard View (Week 2-3)
- Create `BrainDashboard` component
- Build `CategoryCard` components
- Add completion tracking integration
- Integrate "Test Your AI" prominently

### Phase 3: AI Preview Enhancement (Week 3-4)
- Live voice preview during interview
- Show "Here's how your AI will respond" after each section
- Gap detection: "Your AI can't answer X yet"

### Phase 4: Polish & Testing (Week 4)
- A/B test with real businesses
- Iterate on question wording
- Performance optimization

---

## Key Design Principles

1. **Ask, Don't Configure** - Scenario questions instead of form fields
2. **Show, Don't Tell** - AI preview at every step
3. **Progressive Disclosure** - Start simple, offer depth
4. **Mode-First Thinking** - Every screen adapts to business type
5. **Test Early, Test Often** - "Test Your AI" always one click away

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Interview feels too long | Allow skip with "I'll do this later" |
| Answers don't map cleanly | Fallback to manual Business Brain |
| Existing users confused | Show "classic view" toggle |
| AI preview is slow | Use cached/mocked preview |
