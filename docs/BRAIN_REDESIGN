The Core Problem

The Business Brain is organized by system function (services, operations, knowledge) instead of business owner thinking. A towing company owner doesn't think "I'll configure my Services & Pricing tab, then my How You Operate tab." They think "I need to set up my tow rates" and "I need to tell the AI about my coverage area." These are the same thought -- but the current UI splits them across two different tabs.

The result: 60+ configuration sections spread across 5 generic tabs, where a salon owner and a towing company see nearly identical structure. The visibility rules hide irrelevant sections, but the skeleton is the same. A dentist and a pizza shop shouldn't feel like they're using the same tool.

The Solution: Mode-Shaped Brain

Instead of 5 generic tabs that filter items, the Business Brain should present a structure that matches how each business type actually thinks about their operations. The tabs themselves, their names, their order, and what's inside them should change based on business mode and capabilities.

Design Principles





The tab names should use the owner's language -- not system language



Related things stay together -- pricing and services in one place, not split across tabs



Every field shows "Why the AI needs this" -- inline, not in a separate panel



Essential fields are visually distinct from optional ones



The AI preview shows what the AI will actually say based on current data



No empty states without guidance -- every section explains what to do and why



New Tab Structure by Business Mode

Service Mode (Salon, Auto Shop, HVAC, Plumber, etc.)







Tab



What's Inside



Why This Grouping





About You



Name, tagline, hours, address, timezone



"Who are you?"





What You Offer



Service catalog (with complexity + price factors), pricing rules, packages, extra fees, additional services



"What can the AI sell?"





Scheduling



Calendar sync, service area, arrival estimates, booking delivery, appointment buffer



"How do customers book?"





Your Rules



Cancellation/deposit/payment policies, required questions, never-promise, custom policies



"What are the guardrails?"





AI Training



Greeting script, behavior mode, call flow, guidelines, FAQs, objections, industry knowledge, documents



"How should the AI sound and what should it know?"

Dispatch Mode (Towing, Roadside, Courier)







Tab



What's Inside



Why This Grouping





About You



Name, tagline, hours (24/7 emphasis), address



"Who are you?"





Rates & Services



Tow service catalog, dispatch fees, distance pricing/basis, equipment fees, impound fees, extra fees, additional services



"How much do you charge?"





Coverage & Dispatch



Service area, coverage zones, ETAs, workload, dispatch delivery, IVR/call routing



"Where do you go and how fast?"





Your Rules



Policies, never-promise, required questions, custom policies, impound lot details, release requirements



"What are the guardrails?"





AI Training



Greeting, guidelines, FAQs, objections, vehicle knowledge, roadside situations, documents



"What should the AI know?"

Food Mode (Restaurant, Catering, Pizza Shop)







Tab



What's Inside



Why This Grouping





About You



Name, tagline, hours (kitchen hours emphasis), address



"Who are you?"





Menu & Pricing



Service types (dine-in/pickup/delivery/catering), menu catalog, sizes, specials, order settings



"What do you serve and how much?"





Ordering & Delivery



Delivery zones, catering coverage, food delivery settings



"How do orders get fulfilled?"





Your Rules



Policies, never-promise, required questions, custom policies (allergy emphasis)



"What are the guardrails?"





AI Training



Greeting, guidelines, FAQs, objections, menu knowledge, catering knowledge, documents



"What should the AI know?"

Medical Mode (Dentist, Med Spa, Doctor)







Tab



What's Inside



Why This Grouping





About You



Name, tagline, hours, address, HIPAA compliance



"Who are you?"





Services & Insurance



Service catalog (procedures), practice pricing, packages



"What do you offer and accept?"





Scheduling



Calendar sync, visit options, service area, booking delivery, intake delivery



"How do patients book?"





Patient Policies



Policies, never-promise, required questions (intake emphasis), custom policies



"What are the guardrails?"





AI Training



Greeting, guidelines, FAQs, objections, symptom triage, insurance knowledge, documents



"What should the AI know?"

General / Sales Mode







Tab



What's Inside



Why This Grouping





About You



Name, tagline, hours, address



"Who are you?"





What You Offer



Service/product catalog, pricing rules, packages



"What can the AI talk about?"





Availability



Calendar sync (if booking), response times, service area, callback delivery



"How do people reach you?"





Your Rules



Policies, never-promise, required questions, custom policies



"What are the guardrails?"





AI Training



Greeting, behavior mode, call flow, guidelines, FAQs, objections, product knowledge, documents



"What should the AI know?"



Key UX Changes

1. Inline "AI Uses This For" Badges

Every field group shows a small, dismissible callout: "Your AI uses this to: [answer pricing questions / quote arrival times / etc.]" -- not in a side panel, but right next to the field.

2. Essential vs Optional Visual Hierarchy





Required for AI fields have a colored left border (e.g., amber) and a small badge



Recommended fields have a subtle indicator



Advanced/Optional fields are in a collapsible "More Options" group at the bottom of each tab

3. Live AI Preview Per Section

When you fill in services + pricing, a small preview card shows: "Here's what your AI would say if someone asks about an oil change: 'An oil change starts at sixty-five dollars. The final price depends on your vehicle type and the oil grade you need. What kind of car do you have?'"

This uses the same buildServicesForPrompt output that the actual AI uses, so it's not a mock -- it's real.

4. Guided Empty States

When a section has no data, instead of a blank form, show:





What this section does (one sentence)



Why the AI needs it (one sentence)



A mode-specific example of what good data looks like



A "Quick Fill" button that pre-populates from the industry template

5. Completion Indicator Per Tab

Each tab shows a small progress ring in the tab header. The dashboard shows overall completion. This already exists but should be mode-aware in its requirements.



Technical Implementation Plan

This is a Claude Code task due to the scope. Here's the spec to take there:

Phase 1: Mode-Shaped Tab Registry (New File)

Create src/config/brainModeLayout.ts -- a new registry that replaces the current flat brainSectionRegistry.ts with a mode-keyed structure:

type ModeLayout = {
  tabs: Array<{
    id: string;
    title: string;           // Mode-specific tab name
    icon: LucideIcon;
    items: BrainSectionItem[];  // Reuses existing item definitions
    groups: SectionGroup[];     // Pre-grouped
  }>;
};

const MODE_LAYOUTS: Record<BusinessMode, ModeLayout> = { ... };

This file controls tab titles, tab order, and which items appear in which tab -- all per mode. The existing BrainEditorRenderer switch statement doesn't change; only the navigation structure changes.

Phase 2: Update BusinessBrainPage.tsx

Replace the current "5 fixed tabs + visibility filtering" with:





Read businessMode from tenant config



Look up MODE_LAYOUTS[businessMode] to get the tab structure



Render tabs with mode-specific titles and icons



Everything else (sidebar, content panel, editor rendering) stays the same

Phase 3: Move Items Between Tabs Based on Mode

The key changes:





Calendar sync moves from "Your Business" to "Scheduling" (service/medical) or disappears (dispatch/food)



Service area moves from "How You Operate" to "Scheduling" (service) or "Coverage & Dispatch" (dispatch)  



Impound lot/fees move from "Compliance" subgroup to "Your Rules" tab (dispatch)



Required questions can appear in both "Your Rules" AND "AI Training" (linked, not duplicated)

Phase 4: Enhanced Field-Level Guidance

Update each editor component to accept and display:





aiUsesThisFor: string[] -- shown inline next to the section header



exampleData: Record<BusinessMode, string> -- shown in empty state



isRequired: boolean -- drives the visual hierarchy

Phase 5: AI Preview Integration

Add a <AIPreviewCard> component that:





Takes the current section's data



Runs it through the relevant buildXForPrompt function



Shows "Here's what your AI would say..." 



Updates in real-time as the owner types

What Does NOT Change





All 60+ editor components stay exactly the same



BrainEditorRenderer switch statement stays the same  



Database schema stays the same



buildBusinessContext.ts stays the same



All hooks stay the same



The data flow into ElevenLabs stays the same

Only the navigation structure and tab organization changes. This is a UI reorganization, not a data model change.