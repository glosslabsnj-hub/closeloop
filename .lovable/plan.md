
# Plan: Enhanced Onboarding Experience for CloseLoop

## Overview
This plan addresses the user feedback to make the onboarding flow simpler, smarter, and more comprehensive for local service businesses.

---

## Issues to Fix

### 1. Launch Button Error
The error occurs because the onboarding page doesn't properly handle authentication state. When clicking "Launch CloseLoop", the function silently fails if the user isn't logged in, or encounters RLS policy issues.

**Solution**: Add proper error handling, authentication checks, and display meaningful error messages.

---

### 2. Expanded Industry List

**Current State**: Only 6 industries (detailing, hvac, plumber, medspa, dental, other)

**New Industries to Add**:
- Tire Shop / Auto Repair
- Cleaning Services (House/Commercial)
- Landscaping / Lawn Care
- Pest Control
- Roofing
- Electrical
- Pool Service
- Moving Company
- Salon / Barbershop
- Fitness / Personal Training
- Photography
- Pet Grooming
- Towing
- Locksmith

**Database Change Required**: Add new values to the `industry_type` enum.

---

### 3. "Other" Industry - Custom Text Input

When a user selects "Other", show an input field where they can type their specific industry name. This will be stored in a new `custom_industry` column on the `tenants` table.

---

### 4. Expanded & Editable Service Templates

**Current State**: 3 services per industry, not editable

**Improvements**:
- 5-8 preset services per industry
- All services are editable inline (name, duration, price)
- Users can add/remove services
- Each industry gets realistic, relevant defaults

**Example for Tire Shop**:
| Service | Duration | Price |
|---------|----------|-------|
| Tire Rotation | 30 min | $25 |
| Flat Tire Repair | 45 min | $35 |
| Tire Installation (4) | 60 min | $80 |
| Wheel Alignment | 60 min | $89 |
| Brake Inspection | 30 min | $0 (free) |
| Oil Change | 30 min | $45 |
| Battery Replacement | 30 min | $150 |

---

### 5. Industry-Specific Smart Context

Different industries need different information from customers. Add industry-specific "context fields" that the AI will collect during calls.

**Examples**:
- **Tire Shop / Auto Repair**: Vehicle make, model, year, mileage
- **HVAC**: Property type, system type, square footage
- **Detailing**: Vehicle type, size, current condition
- **Med Spa**: Treatment interest, skin concerns
- **Dental**: Insurance provider, procedure type
- **Cleaning**: Property size, frequency, special requirements

This will be stored as `required_context_fields` in the tenant configuration.

---

### 6. AI Voice Assistant as Premium Feature

**Current State**: Toggle during onboarding

**New Approach**:
- Remove AI toggle from onboarding wizard
- AI Voice Assistant becomes a premium feature activated via:
  - Settings page upgrade option
  - Separate pricing tier
  - "Add AI Assistant" CTA on dashboard
- Show "Coming Soon" or "Upgrade to enable" messaging
- Basic automations (SMS follow-ups) remain free

---

## Implementation Steps

### Step 1: Database Migration
- Add new industry types to the enum
- Add `custom_industry` column to tenants table
- Add `context_fields_json` column to tenants table for industry-specific field requirements

### Step 2: Update OnboardingPage.tsx

**Step 2a - Business Info (Step 1)**
- Simplify to just business name field prominently displayed
- Expand industry dropdown with 15+ options
- When "Other" is selected, show text input for custom industry
- Keep timezone selector

**Step 2b - Services (Step 2)**
- Display 5-8 preset services based on industry
- Make each service fully editable:
  - Service name (text input)
  - Duration (dropdown: 15, 30, 45, 60, 90, 120, 180, 240 min)
  - Price (number input)
- Add "Add Service" button
- Add delete button per service
- Show price type selector (fixed/starting at/quote only)

**Step 2c - Business Hours (Step 3)**
- Add a dedicated step for business hours
- Day-by-day configuration
- "Copy to all weekdays" shortcut

**Step 2d - Automations (Step 4)**
- Keep current automation toggle cards
- These are the "free tier" automations

**Step 2e - Completion (Step 5)**
- Remove AI assistant from onboarding
- Show summary of what was set up
- Add "Explore AI Assistant" CTA that links to upgrade path

### Step 3: Fix Launch Error
- Add proper authentication validation
- Show login prompt if not authenticated
- Add try-catch with user-friendly error messages
- Add loading states during database operations

### Step 4: Create Service Template Data
Create comprehensive service templates for each industry with realistic names, durations, and prices.

---

## Technical Details

### New Database Columns (tenants table)
```text
custom_industry: TEXT (nullable) - For "Other" industry type
context_fields_json: JSONB - Industry-specific fields the AI should collect
```

### New Industry Enum Values
```text
tire_shop, cleaning, landscaping, pest_control, roofing, 
electrical, pool_service, moving, salon, fitness, 
photography, pet_grooming, towing, locksmith
```

### Service Template Structure
```typescript
interface ServiceTemplate {
  name: string;
  duration: number; // minutes
  price: number;
  priceType: 'fixed' | 'starting_at' | 'quote_only';
  depositAmount?: number;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/new.sql` | Add industry enum values, new columns |
| `src/pages/app/OnboardingPage.tsx` | Complete redesign with new features |
| `src/types/database.ts` | Update IndustryType, add new interfaces |
| `src/components/onboarding/ServiceEditor.tsx` | New component for editable services |
| `src/components/onboarding/BusinessHoursEditor.tsx` | New component for hours setup |
| `src/data/industryTemplates.ts` | New file with all industry service templates |

---

## User Experience Flow

```text
Step 1: Business Basics
├── Business name (prominent input)
├── Industry selector (15+ options)
├── If "Other" → show custom industry input
└── Timezone

Step 2: Your Services  
├── Pre-filled services based on industry
├── Each service is editable (name, duration, price)
├── Add/remove services
└── Continue

Step 3: Business Hours
├── Day-by-day hours
├── Closed toggle per day
└── Quick actions (copy to weekdays)

Step 4: Automations
├── Toggle cards for basic automations
└── These are included free

Step 5: Launch
├── Summary checklist
├── "Launch" button with proper error handling
└── "Explore AI Assistant" upgrade CTA
```

---

## Edge Cases Handled

- **Unauthenticated users**: Redirect to login with return URL
- **Empty business name**: Validation before proceeding
- **No services**: Require at least 1 service
- **Database errors**: Show toast with specific error message
- **RLS policy failures**: Handle gracefully with retry option
