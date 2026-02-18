Complete Platform Intelligence Redesign: Industry-Aware Everything

What This Solves

The platform currently operates at the "mode" level (service, dispatch, food, medical, general) but treats every business within a mode identically. An auto repair shop and a hair salon both see the same "Services and Pricing" section with the same labels, the same confusing "Pricing Rules" editor, and the same ETA guidance. The inbox dumps raw JSON. The dashboard shows generic metrics.

This redesign makes every layer -- Business Brain interiors, Inbox, and Dashboard -- aware of the specific industry (auto_repair, hair_salon, plumbing, towing, pizza, dental, etc.) and adapts labels, fields, guidance, layout, and behavior accordingly.



Part 1: Industry Context Foundation

New Hook: useIndustryContext()

A single hook that resolves the tenant's industry slug and provides everything downstream components need. It reads tenant.industry from AuthContext and resolves through the existing 3-tier terminology system in industryTerminology.ts.

Returns:





slug ("auto_repair", "hair_salon", "plumbing", etc.)



category ("auto_services", "beauty_wellness", "home_services", etc.)



mode ("service", "dispatch", "food", "medical", "general")



terminology (full IndustryTerminology object with labels, examples)



catalog (IndustryCatalogEntry with services, contextFields, FAQs)



pricingModel ("per_service", "estimate_first", "menu_fixed", "distance_tiered")

New Config: src/config/industryBrainConfig.ts

Maps industry slugs and categories to Brain-specific customizations using the same inheritance pattern as industryTerminology.ts: mode defaults (5 configs), category overrides (12 configs), slug overrides (only where needed).

Each industry config defines:





Section labels: "Your Shop Rates" vs "Your Salon Pricing" vs "Your Tow Rates"



Hidden sections: ETA guidance hidden for non-dispatch, distance pricing hidden for salons



Pricing behavior: Whether most services are quotable or estimate-first



Intake fields: What the AI should ask callers (vehicle info for auto, property type for HVAC)



Dashboard metrics: Which KPIs to show and how to label them



Inbox field map: Which extracted_payload fields to display and what to call them



Priority rules: What makes a call high-priority for this business type



Part 2: Business Brain Interior Redesign

2A. Tab Structure (Mode-Shaped Navigation)

Each mode gets 5 tabs with mode-specific names. This is the navigation layer from the previous spec (already partially applied by Claude Code). The tab titles use industry terminology:

Service Mode tabs:







Tab



Auto Repair Label



Salon Label



Plumber Label





Tab 1



About Your Shop



About Your Salon



About Your Business





Tab 2



Your Shop Services



Your Salon Services



Your Services





Tab 3



Scheduling and Area



Scheduling



Scheduling and Area





Tab 4



Your Rules



Your Policies



Your Rules





Tab 5



Train Your AI



Train Your AI



Train Your AI

Dispatch Mode tabs (same for all dispatch industries):
About You, Rates and Services, Coverage and Dispatch, Your Rules, Train Your AI

Food Mode tabs:
About You, Menu and Ordering, Delivery and Coverage, Your Rules, Train Your AI

Medical Mode tabs:
About Your Practice, Services and Insurance, Patient Scheduling, Patient Policies, Train Your AI

2B. Pricing Section Overhaul (The Core Problem)

Kill the abstract Pricing Rules Editor for non-dispatch businesses. Replace with an integrated pricing experience:

How it works per industry:

Auto Repair (Smiles AutoWorks):





Each service in the catalog has: Name, Price Type (Fixed / Starting At / Requires Estimate), Price, Duration, and "What makes the price vary?" (free text: "vehicle make, parts needed, labor time")



The AI quoting behavior is configured right on the service card:





Fixed price: AI says "An oil change is $45"



Starting at: AI says "Brake pads start at $150, depends on your vehicle"



Requires estimate: AI says "We'd need to see the vehicle. Can I schedule a diagnostic appointment?"



No separate Pricing Rules editor. The service catalog IS the pricing configuration.



A simple "Surcharges" section below for after-hours fees, vehicle size upcharges, emergency rates (this is the existing PriceModifiersEditor, just renamed and placed better)



No ETA guidance -- completely hidden. Replaced with a small "Quoting Behavior" guidance card that says: "Your AI quotes prices for services you've set. For estimate-required services, it collects vehicle details and offers to schedule a diagnostic."

Hair Salon:





Same inline pricing on service cards



Price factors: "hair length, color complexity, add-on treatments"



No ETA guidance. Quoting guidance says: "Your AI quotes appointment prices and mentions that final cost may vary by hair length and complexity."



Surcharges might include "long hair" or "color correction" upcharges

Plumber / HVAC:





Mix of fixed (drain cleaning: $149) and estimate-first (water heater install: requires estimate)



The "urgency" surcharge is prominent here (same-day fee, emergency rate)



Quoting guidance: "Your AI quotes standard service prices. For complex jobs, it collects property details and schedules a diagnostic visit."

Towing (Hawk's Towing):





KEEPS the existing DispatchServiceCatalog + DispatchPricingEditor + distance pricing -- these already work well



KEEPS ETA guidance -- it's relevant here



No changes to dispatch pricing flow

Restaurant:





Menu items have fixed prices. No pricing rules needed at all.



The menu catalog editor is the pricing tool.

Medical:





Fee schedule approach. "Cleaning and Exam: $150 (insurance may cover)"



Insurance/copay note per service



MedicalPricingEditor stays

Implementation details:





PricingRulesEditor.tsx gets hidden for all service-mode businesses via the registry visibility function. Its functionality is already duplicated in the service catalog's inline price_type selector.



PricingEtaGuidance.tsx only renders for dispatch mode. For other modes, a new QuotingBehaviorGuidance.tsx component shows industry-specific quoting advice (2-3 sentences, not a wall of text).



PriceModifiersEditor.tsx stays but gets renamed per industry ("Surcharges" for auto, "Price Adjustments" for salon, "Extra Fees" for plumber) and is placed as an "advanced" section.

2C. Service Catalog Interior (Industry-Aware Fields)

The ServiceCatalogEditor.tsx already uses getServiceExamples(businessMode) for placeholders. Extend this to use useIndustryContext() for slug-level specificity:

Auto Repair sees:





Service name placeholder: "e.g., Oil Change, Brake Inspection, Engine Diagnostic"



Description placeholder: "What's included and common parts/labor"



Duration hint: "How long does this job typically take?"



Price factor hint: "e.g., Vehicle make/model, parts quality, labor hours"



Complexity hint: Simple = "Oil change, tire rotation, fluid top-off" / Complex = "Engine diagnostic, transmission, electrical"

Salon sees:





Service name placeholder: "e.g., Women's Cut, Balayage, Keratin Treatment"



Description placeholder: "What's included in this service"



Duration hint: "Typical appointment length"



Price factor hint: "e.g., Hair length, color complexity, add-on treatments"



Complexity hint: Simple = "Haircut, blowout, beard trim" / Complex = "Full color, balayage, extensions"

This data already exists partially in industryExamples.ts at the mode level. Extend it to slug-level resolution.

2D. Knowledge / AI Training Section

The existing separate editors (FAQs, Objections, Guidelines, etc.) stay but get pre-populated with industry-specific examples from the industryCatalog. When a section is empty, the empty state shows:





Industry-specific starter items with one-click "Add These" button



"What this does for your AI" explanation in one sentence



An example of what the AI would say using this knowledge

The section labels adapt by industry:





Auto repair: "Common Customer Questions" instead of "FAQs"



Towing: "Common Caller Questions"



Restaurant: "Guest Questions"



Medical: "Patient Questions"



Part 3: Inbox / Call Detail Redesign

3A. Structured Call Detail (Replace JSON Dump)

CallDetailPanel.tsx currently renders extracted_payload as JSON.stringify. Replace with a structured, industry-aware display.

New component: ExtractedPayloadDisplay.tsx

Reads the extracted_payload canonical schema (intent-based) and renders fields with human-readable labels. The field map adapts by industry:

Auto Repair call result:

What the AI Collected
  Customer: John Smith
  Phone: (555) 123-4567
  Vehicle: 2019 Honda Civic
  Service Needed: Brake Inspection
  Urgency: Soon - hearing grinding noise
  Price Quoted: Starting at $150
  
Outcome: Appointment Booked
  Date: Tuesday, Feb 18 at 10:00 AM
  Estimated Duration: 45 minutes

Towing call result:

What the AI Collected
  Caller: Mike Davis
  Phone: (555) 987-6543
  Vehicle: 2021 Ford F-150
  Situation: Won't start, needs tow
  Pickup: 1234 Main St, Springfield
  Dropoff: Hawk's Towing yard
  
Outcome: Dispatched
  Driver: Unit 3
  ETA: 25-35 minutes
  Quoted: $85 hookup + $3.50/mi

Salon call result:

What the AI Collected
  Client: Sarah Johnson
  Phone: (555) 456-7890
  Service: Balayage + Cut
  New Client: Yes
  Stylist Preference: No preference
  
Outcome: Booked
  Date: Wednesday, Feb 19 at 2:00 PM

The raw JSON moves to a collapsible "Debug Data" section at the very bottom, collapsed by default.

3B. Call Priority System

Add priority indicators to the inbox based on multiple signals:

Priority scoring factors:





Urgency keywords in transcript/summary: "emergency", "ASAP", "broken", "leaking" = +priority



Lead temperature: Caller ready to book now vs just asking questions



Revenue potential: Based on service requested (engine repair > oil change)



Unresolved status: AI couldn't book/dispatch = needs human follow-up = highest priority



Missed/lost calls: Always high priority

Visual treatment:





High priority: Red left border, "Needs Attention" badge, sorted to top



Medium priority: Amber indicator, "Follow Up" badge



Low priority: No special treatment, standard display

This leverages the existing lead_score (Hot, Warm, Cool) and followup_status fields already in ai_call_sessions.

3C. Inbox Card Improvements

InboxCallCard.tsx gets industry-aware preview text. Instead of just showing the summary, show:





Primary action in bold: "Booked for Tuesday" or "Callback Requested" or "Dispatched"



Key detail: The service/job type, not just the raw summary



Priority badge if high/medium priority



Part 4: Dashboard Industry Awareness

Mode layouts stay but labels and metrics adapt by industry slug:

Auto Repair Dashboard:





Metric 1: "Vehicles Today" (count of today's appointments)



Metric 2: "Pending Estimates" (callbacks with estimate intent)



Metric 3: "Customers" (total unique)



Mode content: Today's appointment list, pending estimate requests

Salon Dashboard:





Metric 1: "Clients Today"



Metric 2: "This Week's Bookings"



Metric 3: "New Clients"



Mode content: Today's schedule, walk-in availability

Plumber Dashboard:





Metric 1: "Jobs Today"



Metric 2: "Emergency Queue" (high-urgency callbacks)



Metric 3: "Estimates Pending"



Mode content: Today's jobs, pending callbacks

Towing Dashboard:





Already works well -- no changes needed



Metric labels stay as-is (Active Jobs, Avg Response, etc.)

Restaurant Dashboard:





Metric 1: "Orders Today"



Metric 2: "Reservations Tonight"



Metric 3: "Guests Served"

Implementation: MetricsGrid.tsx receives industryContext and swaps labels. The queries stay the same (same tables), only the display labels change. Dashboard layout components get the same treatment.



Part 5: What Does NOT Change





Database schema -- no migrations needed



Edge functions -- all 75+ stay exactly as-is



ElevenLabs integration -- buildBusinessContext.ts and the AI data flow are untouched



The dispatch experience (Hawk's Towing) -- must continue working perfectly



All hooks -- useServices, useSettings, useCalendarConnections, etc. stay the same



The actual editor component logic -- forms still save to the same tables with the same fields. Only labels, placeholders, visibility, and guidance text change.



File Change Summary







File



Type



What Changes





src/hooks/useIndustryContext.ts



NEW



Industry context provider hook





src/config/industryBrainConfig.ts



NEW



Industry-specific brain/inbox/dashboard config





src/components/calls/ExtractedPayloadDisplay.tsx



NEW



Structured payload display replacing JSON





src/components/brain/guidance/QuotingBehaviorGuidance.tsx



NEW



Replaces ETA guidance for non-dispatch





src/data/industryTerminology.ts



MODIFY



Add more slug-level overrides for all sections





src/lib/industryExamples.ts



MODIFY



Add slug-level examples (not just mode-level)





src/config/brainSectionRegistry.ts



MODIFY



Wire titleKey to industry terminology, hide pricing rules for service mode





src/pages/app/BusinessBrainPage.tsx



MODIFY



Pass industry context, use mode layouts





src/components/settings/PricingRulesEditor.tsx



MODIFY



Hidden for service mode (visibility function)





src/components/brain/guidance/PricingEtaGuidance.tsx



MODIFY



Only render for dispatch mode





src/components/brain/ServiceCatalogEditor.tsx



MODIFY



Use slug-level examples instead of mode-level





src/components/brain/PriceModifiersEditor.tsx



MODIFY



Industry-aware rename ("Surcharges" / "Extra Fees")





src/components/calls/CallDetailPanel.tsx



MODIFY



Use ExtractedPayloadDisplay, add priority badge





src/components/calls/InboxCallCard.tsx



MODIFY



Industry-aware preview, priority indicators





src/pages/app/UnifiedInboxPage.tsx



MODIFY



Priority sorting/filtering





src/components/dashboard/MetricsGrid.tsx



MODIFY



Industry-aware metric labels





src/components/dashboard/ModeContentArea.tsx



MODIFY



Pass industry context to layouts





Dashboard layout files



MODIFY



Industry-aware section labels



Claude Code Execution Instructions

Read these files first to understand architecture:





src/data/industryCatalog.ts (80+ industry definitions, templates, contextFields)



src/data/industryTerminology.ts (3-tier terminology resolution system)



src/lib/industryExamples.ts (mode-level examples for service editors)



src/config/brainSectionRegistry.ts (60+ sidebar items with visibility rules)



src/components/brain/layout/BrainEditorRenderer.tsx (item-to-editor mapping)



src/pages/app/BusinessBrainPage.tsx (main brain page, 611 lines)



src/components/settings/PricingRulesEditor.tsx (577 lines -- the generic pricing rules editor)



src/components/brain/ServiceCatalogEditor.tsx (636 lines -- service catalog with inline pricing)



src/components/brain/PriceModifiersEditor.tsx (792 lines -- surcharges/modifiers)



src/components/brain/guidance/PricingEtaGuidance.tsx (ETA guidance -- shown to all modes)



src/components/calls/CallDetailPanel.tsx (inbox detail -- has JSON dump)



src/components/calls/InboxCallCard.tsx (inbox card)



src/pages/app/UnifiedInboxPage.tsx (inbox page)



src/components/dashboard/LiveDashboard.tsx (dashboard)



src/components/dashboard/MetricsGrid.tsx (metrics strip)



src/components/dashboard/ModeContentArea.tsx (mode-specific dashboard content)



src/hooks/useTenantConfig.ts (tenant config with businessMode)



src/contexts/AuthContext.tsx (tenant data including industry slug)

Then implement in this order:





useIndustryContext hook + industryBrainConfig.ts (foundation)



ExtractedPayloadDisplay.tsx + CallDetailPanel fix (highest-impact quick win)



Inbox priority system (InboxCallCard + UnifiedInboxPage)



Brain section labels and visibility (registry + terminology updates)



Pricing section: hide PricingRulesEditor for service mode, hide PricingEtaGuidance for non-dispatch, add QuotingBehaviorGuidance



Service catalog: slug-level examples



Dashboard: industry-aware metric labels

Testing: Verify with Hawk's Towing (dispatch), Smiles AutoWorks (auto repair), and at least one food tenant.