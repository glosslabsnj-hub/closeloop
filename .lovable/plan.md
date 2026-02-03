
# Make Dashboard Terms Industry-Aware

## Overview

This plan creates a centralized terminology system so all user-facing text automatically adapts based on the business mode (service, dispatch, food, medical, general). Instead of saying "bookings" for restaurants or "services" for medical practices, the UI will use contextually appropriate terms.

---

## Current State

The codebase has scattered hardcoded terms that don't adapt to business mode:

| Current Term | Service | Dispatch | Food | Medical | General |
|-------------|---------|----------|------|---------|---------|
| "Bookings" | Bookings | Jobs | Orders | Appointments | Bookings |
| "Services" | Services | Services | Menu | Services | Offerings |
| "Customer" | Customer | Customer | Guest | Patient | Customer |
| "Booking created" | Booking created | Job dispatched | Order placed | Appointment scheduled | Booking created |

---

## Solution: Centralized Terminology Hook

Create a single source of truth for all industry-aware terms.

### New File: `src/lib/terminology.ts`

```typescript
// Centralized terminology mapping by business mode
export interface IndustryTerms {
  // Core entities
  booking: string;
  bookings: string;
  service: string;
  services: string;
  customer: string;
  customers: string;
  
  // Actions
  bookingCreated: string;
  viewBookings: string;
  addService: string;
  
  // Page titles
  bookingsPageTitle: string;
  servicesPageTitle: string;
  
  // Setup steps
  addServicesStep: string;
  addServicesDescription: string;
}

const TERMINOLOGY: Record<BusinessMode, IndustryTerms> = {
  service: {
    booking: "booking",
    bookings: "bookings",
    service: "service",
    services: "services",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Booking created",
    viewBookings: "View Bookings",
    addService: "Add Service",
    bookingsPageTitle: "Schedule",
    servicesPageTitle: "Services",
    addServicesStep: "Add your services",
    addServicesDescription: "What you offer and pricing",
  },
  dispatch: {
    booking: "job",
    bookings: "jobs",
    service: "service",
    services: "services",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Job dispatched",
    viewBookings: "Dispatch Queue",
    addService: "Add Service",
    bookingsPageTitle: "Dispatch Queue",
    servicesPageTitle: "Services",
    addServicesStep: "Add your services",
    addServicesDescription: "What jobs you handle and rates",
  },
  food: {
    booking: "order",
    bookings: "orders",
    service: "menu item",
    services: "menu",
    customer: "guest",
    customers: "guests",
    bookingCreated: "Order placed",
    viewBookings: "View Orders",
    addService: "Add Menu Item",
    bookingsPageTitle: "Orders",
    servicesPageTitle: "Menu",
    addServicesStep: "Add your menu",
    addServicesDescription: "Items you serve and pricing",
  },
  medical: {
    booking: "appointment",
    bookings: "appointments",
    service: "service",
    services: "services",
    customer: "patient",
    customers: "patients",
    bookingCreated: "Appointment scheduled",
    viewBookings: "View Appointments",
    addService: "Add Service",
    bookingsPageTitle: "Appointments",
    servicesPageTitle: "Services",
    addServicesStep: "Add your services",
    addServicesDescription: "Procedures and visit types",
  },
  general: {
    booking: "booking",
    bookings: "bookings",
    service: "offering",
    services: "offerings",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Booking created",
    viewBookings: "View Bookings",
    addService: "Add Offering",
    bookingsPageTitle: "Bookings",
    servicesPageTitle: "Offerings",
    addServicesStep: "Add your offerings",
    addServicesDescription: "What you provide and pricing",
  },
};

export function getTerminology(mode: BusinessMode): IndustryTerms {
  return TERMINOLOGY[mode] || TERMINOLOGY.service;
}
```

### New Hook: `src/hooks/useTerminology.ts`

```typescript
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getTerminology, IndustryTerms } from "@/lib/terminology";

export function useTerminology(): IndustryTerms {
  const { businessMode } = useTenantConfig();
  return getTerminology(businessMode);
}
```

---

## Files to Update

### 1. Dashboard Components

| File | Changes |
|------|---------|
| `SetupProgressChecklist.tsx` | Use `terms.addServicesStep` instead of "Add your services" |
| `QuickActionsCard.tsx` | Use `terms.viewBookings` instead of "View Bookings" |
| `TodaySnapshot.tsx` | Use `terms.bookings` for metric labels |
| `NeedsAttentionBanner.tsx` | Use `terms.booking` for "pending booking" |
| `LiveActivityFeed.tsx` | Use `terms.bookingCreated` for activity titles |

### 2. Navigation & Layout

| File | Changes |
|------|---------|
| `AppLayout.tsx` | Make nav item labels adapt: "Bookings" → `terms.bookingsPageTitle` |

### 3. Page Headers

| File | Changes |
|------|---------|
| `BookingsPage.tsx` | Already says "Schedule" - add subtitle with `terms.bookings` |
| `ServicesPage.tsx` | Use `terms.servicesPageTitle` for page title |

### 4. Settings Page

| File | Changes |
|------|---------|
| `SettingsPage.tsx` | "Bookings" in alerts → `terms.bookings` |

---

## Implementation Details

### Example: SetupProgressChecklist.tsx

Before:
```typescript
{
  id: "services",
  label: "Add your services",
  description: "What you offer and pricing",
  // ...
}
```

After:
```typescript
const terms = useTerminology();

{
  id: "services",
  label: terms.addServicesStep,
  description: terms.addServicesDescription,
  // ...
}
```

### Example: QuickActionsCard.tsx

Before:
```typescript
case "service":
case "general":
default:
  if (enabledModules.includes("booking")) {
    actions.push({ label: "View Bookings", icon: Calendar, href: "/app/bookings" });
  }
```

After:
```typescript
const terms = useTerminology();

case "service":
case "general":
default:
  if (enabledModules.includes("booking")) {
    actions.push({ label: terms.viewBookings, icon: Calendar, href: "/app/bookings" });
  }
```

### Example: AppLayout.tsx Nav Items

Before:
```typescript
const allNavItems: NavItem[] = [
  { href: "/app/bookings", label: "Bookings", icon: Calendar, requiredModules: ["booking"] },
  // ...
];
```

After (using a function to get dynamic labels):
```typescript
const getNavItems = (terms: IndustryTerms): NavItem[] => [
  { href: "/app/bookings", label: terms.bookingsPageTitle, icon: Calendar, requiredModules: ["booking"] },
  // ...
];

// In component:
const terms = useTerminology();
const navItems = useMemo(() => {
  const baseItems = getNavItems(terms);
  return baseItems.filter(/* existing filter logic */);
}, [enabledModules, terms]);
```

---

## Complete Term Mapping

| Context | Service | Dispatch | Food | Medical | General |
|---------|---------|----------|------|---------|---------|
| **Nav label** | Bookings | Dispatch | Orders | Appointments | Bookings |
| **Page title** | Schedule | Dispatch Queue | Orders | Appointments | Schedule |
| **Quick action** | View Bookings | Dispatch Queue | View Orders | View Appointments | View Bookings |
| **Setup step** | Add your services | Add your services | Add your menu | Add your services | Add your offerings |
| **Attention item** | pending booking | pending job | new order | pending appointment | pending booking |
| **Activity feed** | Booking created | Job dispatched | Order placed | Appointment scheduled | Booking created |
| **Customer term** | customer | customer | guest | patient | customer |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/terminology.ts` | NEW - Centralized term definitions |
| `src/hooks/useTerminology.ts` | NEW - Hook to access terms |
| `src/components/layouts/AppLayout.tsx` | Update nav labels |
| `src/components/dashboard/SetupProgressChecklist.tsx` | Use terms for steps |
| `src/components/dashboard/QuickActionsCard.tsx` | Use terms for actions |
| `src/components/dashboard/TodaySnapshot.tsx` | Use terms for metrics |
| `src/components/dashboard/NeedsAttentionBanner.tsx` | Use terms for items |
| `src/components/dashboard/LiveActivityFeed.tsx` | Use terms for activity |
| `src/pages/app/BookingsPage.tsx` | Use terms for page text |
| `src/pages/app/ServicesPage.tsx` | Use terms for page title |
| `src/pages/app/SettingsPage.tsx` | Use terms in alerts section |

---

## Benefits

1. **Single source of truth** - All terminology in one file
2. **Easy to maintain** - Add new terms in one place
3. **Consistent UX** - Users see familiar terms for their industry
4. **Type-safe** - TypeScript ensures all terms are defined
5. **Extensible** - Easy to add new business modes or terms

---

## Implementation Order

1. Create `src/lib/terminology.ts` with complete term mapping
2. Create `src/hooks/useTerminology.ts` hook
3. Update dashboard components (SetupProgressChecklist, QuickActionsCard, etc.)
4. Update AppLayout nav labels
5. Update page headers and titles
6. Update settings and other secondary pages

This is a low-risk change since it's purely presentational - no business logic or data changes.
