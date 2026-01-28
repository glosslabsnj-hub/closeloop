

# Plan: Intensive Business Onboarding for AI Knowledge

## Overview

The current onboarding is too shallow. For the AI to effectively assist customers, qualify leads, handle objections, and push bookings, it needs deep knowledge about the business. This plan creates a comprehensive 8-step onboarding wizard that collects everything the AI needs to sound like a real employee.

---

## Current State vs. Proposed State

| Current | Proposed |
|---------|----------|
| 5 steps, ~60 seconds | 8 steps, ~3-5 minutes |
| Business name + industry | Full business profile with tagline, location, website |
| Generic services | Services with detailed descriptions, requirements, upsells |
| Basic hours | Hours + booking policies + lead time requirements |
| Toggle automations | Detailed customer intake questions |
| No FAQs | Pre-filled + custom FAQs |
| No objection handling | Common objections with responses |
| No pricing guidance | Pricing rules + deposit policies + discounts |

---

## New Onboarding Steps

### Step 1: Business Identity
Collect who you are and how customers find you.

| Field | Purpose |
|-------|---------|
| Business name | Greeting, branding |
| Tagline/slogan | AI uses in conversation |
| Industry | Templates + context |
| Custom industry (if "other") | For unknown industries |
| Phone number | Display and verification |
| Website | Reference for AI |
| Address/service area | Location-based responses |
| Years in business | Trust building |

### Step 2: Services & Pricing
Deep dive into what you offer.

| Field | Purpose |
|-------|---------|
| Service name | What AI offers |
| Description | AI explains what's included |
| Duration | Scheduling |
| Price + price type | Quoting |
| What's included | AI can explain value |
| Common add-ons/upsells | AI suggests upgrades |
| Deposit required? | Payment collection |
| Preparation instructions | AI tells customer what to do before |

### Step 3: Business Hours & Availability
When can customers book?

| Field | Purpose |
|-------|---------|
| Operating hours | When AI offers slots |
| Lead time (min hours in advance) | Prevents same-day chaos |
| Max advance booking | How far out to book |
| Appointment buffer | Time between appointments |
| Closed dates/holidays | Avoid booking errors |

### Step 4: Customer Intake Questions
What info does your team need before a job?

| Field | Purpose |
|-------|---------|
| Industry-specific fields (auto-populated) | Year/make/model for auto, sqft for cleaning, etc. |
| Custom questions | Business-specific info gathering |
| Required vs optional | AI knows what to push for |

### Step 5: FAQs & Common Questions
What do customers always ask?

Pre-populate with 5-8 industry-specific FAQs (auto-generated), then let user edit/add:

- "What are your hours?"
- "How much does X cost?"
- "Do you offer mobile service?"
- "How long does X take?"
- "Do you require a deposit?"
- "What forms of payment do you accept?"
- "Are you licensed/insured?"
- "What's your cancellation policy?"

### Step 6: Objection Handling
How should AI respond to pushback?

Pre-populate with common objections:

| Objection | Sample Response |
|-----------|-----------------|
| "That's too expensive" | "I understand price is important. We focus on quality and most customers find the value exceeds the cost. Would you like to hear about our most popular package?" |
| "I need to think about it" | "Of course! Would it help if I answered any specific questions? I can also hold a spot for you for 24 hours." |
| "I'll call back later" | "No problem! Would you like me to send you a text with our info and a link to book when you're ready?" |
| "Can I get a discount?" | "We offer our best pricing upfront, but we do have special packages. Let me tell you about those." |

### Step 7: Policies & Rules
Business rules the AI must follow.

| Policy | Purpose |
|--------|---------|
| Cancellation policy | AI explains terms |
| Deposit policy | When/how much to collect |
| Refund policy | Handle complaints |
| Payment methods accepted | Answer payment questions |
| Service area (radius/zip codes) | Decline out-of-area requests |
| What AI should never promise | Guardrails |

### Step 8: Review & Launch
Summary of everything configured, with a "Launch" button.

---

## Database Changes

### New columns on `tenants` table:

```sql
-- Business identity
tagline TEXT,
website_url TEXT,
address TEXT,
service_area_json JSONB, -- { type: 'radius', miles: 25 } or { type: 'zips', codes: [...] }
years_in_business INTEGER,

-- Policies
cancellation_policy TEXT,
deposit_policy TEXT,
refund_policy TEXT,
payment_methods TEXT[], -- ['cash', 'card', 'check', 'venmo', 'zelle']

-- Booking rules
min_lead_hours INTEGER DEFAULT 24,
max_advance_days INTEGER DEFAULT 30,
appointment_buffer_minutes INTEGER DEFAULT 15,
closed_dates JSONB, -- array of dates

-- AI guardrails
ai_never_promise TEXT[], -- things AI should never say yes to
```

### Updates to `services` table:

```sql
description TEXT, -- what's included
preparation_instructions TEXT, -- what customer should do before
upsell_suggestions TEXT[], -- related add-ons
deposit_required BOOLEAN DEFAULT false,
```

### New table: `business_faqs`

```sql
CREATE TABLE business_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New table: `objection_responses`

```sql
CREATE TABLE objection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  objection TEXT NOT NULL,
  response TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Implementation Steps

### Step 1: Database Migration
Create new columns and tables as specified above with appropriate RLS policies for tenant isolation.

### Step 2: Create Onboarding Sub-Components
Build reusable components for each step:

| Component | Purpose |
|-----------|---------|
| `BusinessIdentityForm.tsx` | Name, tagline, contact, location |
| `ServiceEditorAdvanced.tsx` | Enhanced service editor with descriptions, upsells |
| `BookingPoliciesEditor.tsx` | Lead time, buffer, max advance |
| `CustomerIntakeEditor.tsx` | Required info fields |
| `FAQEditor.tsx` | Add/edit/delete FAQs |
| `ObjectionEditor.tsx` | Add/edit objection responses |
| `PoliciesEditor.tsx` | Cancellation, refund, payment methods |

### Step 3: Create Industry-Specific Defaults
Expand `industryTemplates.ts` to include:
- Default FAQs per industry
- Default objection responses per industry
- Default policies per industry

### Step 4: Rewrite OnboardingPage.tsx
- 8-step wizard with progress indicator
- Each step uses its dedicated sub-component
- State management for all collected data
- Validation at each step
- Error handling on final submit

### Step 5: Update handleComplete()
- Insert all new data into appropriate tables
- Create tenant record with extended fields
- Seed FAQs and objection responses
- Proper error handling with rollback messaging

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/new.sql` | Add new columns and tables |
| `src/pages/app/OnboardingPage.tsx` | Complete rewrite with 8 steps |
| `src/components/onboarding/BusinessIdentityForm.tsx` | New |
| `src/components/onboarding/ServiceEditorAdvanced.tsx` | New (replaces current) |
| `src/components/onboarding/BookingPoliciesEditor.tsx` | New |
| `src/components/onboarding/CustomerIntakeEditor.tsx` | New |
| `src/components/onboarding/FAQEditor.tsx` | New |
| `src/components/onboarding/ObjectionEditor.tsx` | New |
| `src/components/onboarding/PoliciesEditor.tsx` | New |
| `src/data/industryTemplates.ts` | Expand with FAQs, objections, policies |
| `src/types/database.ts` | Add new interfaces |

---

## User Experience

```text
Step 1: Tell us about your business
├── Business name (required)
├── Tagline (optional) - "What makes you different?"
├── Industry (required)
├── Years in business (optional)
├── Phone number (required)
├── Website (optional)
└── Service area (address + radius OR zip codes)

Step 2: Your services
├── Pre-filled from industry templates
├── Each service expandable to show:
│   ├── Name, duration, price
│   ├── Description of what's included
│   ├── Preparation instructions
│   ├── Common upsells/add-ons
│   └── Deposit requirement
└── Add/remove services

Step 3: Availability & booking rules
├── Business hours (day by day)
├── Minimum notice required (hours)
├── How far in advance can book (days)
├── Buffer between appointments
└── Closed dates (optional)

Step 4: Customer information
├── Pre-filled based on industry
├── Mark required vs optional
├── Add custom questions
└── "What info do you NEED to do the job?"

Step 5: Frequently asked questions
├── 6-8 pre-filled industry FAQs
├── Edit any answer
├── Add custom FAQs
└── "What do customers always ask?"

Step 6: Handle objections
├── 4-5 pre-filled objection responses
├── Edit any response
├── Add custom objections
└── "How do you overcome hesitation?"

Step 7: Your policies
├── Cancellation policy (text)
├── Deposit policy (text)
├── Refund policy (text)
├── Payment methods accepted (checkboxes)
└── Things AI should never promise (optional)

Step 8: Review & launch
├── Summary of all sections
├── "Edit" links to go back to any section
├── Launch button
└── Progress celebration
```

---

## Rationale

This intensive setup ensures:

1. **AI sounds knowledgeable** - Can answer detailed questions about services, pricing, policies
2. **AI handles objections** - Pre-programmed responses to common pushback
3. **AI books correctly** - Knows lead times, buffers, closed dates
4. **AI collects right info** - Industry-specific intake questions
5. **AI builds trust** - Can cite years in business, policies, guarantees
6. **AI upsells naturally** - Knows related services to suggest

The 3-5 minute investment pays off in an AI that actually sounds like it works for the business.

