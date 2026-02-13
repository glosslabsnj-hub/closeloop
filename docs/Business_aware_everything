Phase 3 UPGRADED: Business-Aware Everything
The Critical Upgrade Over the Previous Plan
The previous Phase 3 plan makes everything "industry-aware" -- all auto repair shops see the same labels, same test scenarios, same advice. But Smiles AutoWorks (3 services, solo operator, oil changes and brakes) is completely different from a 5-bay collision center with fleet accounts and impound services. The platform should know the difference.
Industry-aware = "You're an auto repair shop, so here are auto repair labels." Business-aware = "You're Smiles AutoWorks. You offer oil changes, brake inspections, and general repair. You haven't set up FAQs yet. Your callers keep asking about pricing. Your busiest day is Tuesday. Here's exactly what to do next."
This upgrade layers real tenant data on top of industry defaults so every surface reflects THIS business, not just this industry.

What "Business-Aware" Means Technically
Every component that currently reads industry slug should ALSO read the tenant's actual operational data:
Data Source
What It Tells Us
Where It's Used
services table (tenant's actual services)
What they offer, their prices, complexity
Simulator test scenarios, Partner advice, checklist
business_faqs table
What knowledge the AI has
Partner gaps, checklist completion
ai_call_sessions table
What callers actually ask, conversion patterns
Priority scoring, Partner benchmarks, simulator suggestions
capabilities_json
What features they've enabled
Sidebar gating, section visibility, complexity tier
assistant_settings
AI behavior mode, tone, greeting
Partner advice, simulator context
tenant_users count
Solo vs team
Progressive disclosure, staff section visibility
tenant_locations count
Single vs multi-location
Complexity tier, coverage section prominence
bookings / dispatch_jobs count
Volume level
Stage detection, metric emphasis
calendar_connections
Whether calendar is connected
Checklist, Partner advice
knowledge_gaps table
What the AI couldn't answer
Simulator test scenarios (test the gaps!), Partner critical issues


Gap 1: Sidebar -- Business-Aware (Not Just Capability-Gated)
Previous plan: Gate "Estimates" by capability, change subtitle to industry name.
Upgraded plan: Same gating, but the sidebar subtitle should show the business name context, not just industry:
Line 163 currently shows "AI Receptionist" for everyone
Change to: the tenant's actual tagline if they've set one (from assistant_settings.business_tagline), falling back to industry-aware text like "AI for Auto Repair"
This makes it feel like THEIR platform, not a generic one
Estimates gating stays the same: Only show when caps.hasEstimates or caps.hasPhoneQuotes is true. Remove the unconditional push on line 121.
Files: src/components/layouts/AppSidebar.tsx

Gap 2: Setup Checklist -- Business-Aware Steps
Previous plan: Industry-specific copy ("Add your shop services").
Upgraded plan: The checklist should reference the business's ACTUAL state, not just generic steps:
If they already have 5 services but 0 FAQs: Don't show "Add services" (it's done). Show "Add customer questions -- your AI handled 12 calls last week but couldn't answer 3 questions. Add those answers now." with a direct link to the knowledge gaps section.
If they have services but no prices set: "Set prices for your services -- Oil Change and Brake Inspection don't have prices yet. Your AI can't quote callers without them."
If calendar isn't connected but they have booking enabled: "Connect your calendar -- you have booking turned on but no calendar connected. Your AI can't check availability."
If they have calls but high hangup rate: "Improve your AI greeting -- 35% of callers are hanging up. Try adjusting your greeting in Business Brain."
This means the checklist becomes DYNAMIC based on real queries, not a static list. The SetupProgressChecklist component already queries services, faqs, hours counts. Extend it to also query:
Services without prices (price_type IS NULL OR price IS NULL)
Knowledge gaps count (from knowledge_gaps table or useKnowledgeGaps hook)
Calendar connection status (from calendar_connections)
Recent call metrics (hangup rate, unanswered questions)
Each step's label and description are computed from the tenant's actual data, with industry terminology as the fallback for items that haven't been configured yet.
Files:
src/components/dashboard/SetupProgressChecklist.tsx -- dynamic step generation from real data
New helper: src/lib/setupStepBuilder.ts -- builds step list from tenant state + industry config

Gap 3: Simulator -- Test THIS Business's Actual Scenarios
Previous plan: Industry-specific test phrases ("I need an oil change").
Upgraded plan: Test scenarios should reference the business's ACTUAL services and ACTUAL knowledge gaps:
Tier 1 -- Service-based scenarios (from their services table): If Smiles AutoWorks has services: "Oil Change ($45)", "Brake Inspection (Starting at $150)", "General Repair (Quote required)", generate:
"Hi, I need an oil change. How much is it?"
"How much for a brake inspection on a 2020 Toyota Camry?"
"My car is making a weird noise, can you take a look at it?"
Tier 2 -- Gap-based scenarios (from knowledge_gaps table): If callers have asked questions the AI couldn't answer (e.g., "Do you work on diesels?", "What's your warranty?"), surface those as test scenarios:
"Test this -- callers asked this and your AI didn't know the answer: 'Do you work on diesel trucks?'"
Tier 3 -- Industry fallbacks: If the business has no services yet or no call history, fall back to the industry-slug defaults from the previous plan.
This makes the simulator feel like it KNOWS their business. The banner text changes from "Try these common questions for service businesses" to "Test your AI with questions Smiles AutoWorks customers actually ask."
Implementation:
SuggestedTestsBanner receives tenant services and knowledge gaps as props (or fetches them via hooks)
New function buildTestScenarios(services, gaps, industrySlug) that composes scenarios in priority order: gap-based first, then service-based, then industry fallbacks
Max 5-6 scenarios shown, with a "See more" option
Files:
src/components/simulator/SuggestedTestsBanner.tsx -- use real data
New: src/lib/testScenarioBuilder.ts -- builds scenarios from services + gaps + industry

Gap 4: Dashboard Metrics -- Business-Aware Labels AND Values
Previous plan: Industry-aware labels ("Vehicles Today" for auto repair).
Upgraded plan: Labels should adapt to what the business ACTUALLY does, not just their industry:
If an auto repair shop has NO booking capability (callback-only mode), don't show "Vehicles Today" (implies bookings). Show "Calls Today" and "Callbacks Pending" instead.
If a salon has staff scheduling enabled, show "Stylist Utilization" as a metric. If solo operator, show "Your Availability" instead.
The "Quick Book" / "Schedule Service" button label should use the business's actual most-booked service name: "Quick Book: Oil Change" instead of generic "Quick Book."
This means MetricsGrid reads both industry context AND capability flags AND actual data to determine which metrics to show and how to label them.
Files:
src/components/dashboard/MetricsGrid.tsx -- capability-aware + data-aware labels
src/components/dashboard/layouts/ServiceDashboardLayout.tsx -- dynamic quick action

Gap 5: Business Partner -- Analyze THIS Business, Not "Auto Repair Shops"
Previous plan: Add industry-specific benchmarks to the system prompt.
Upgraded plan: The Business Partner should feel like a consultant who has studied THIS specific business deeply:
Edge function improvements (partner-analysis/index.ts):
The buildContextDocument() function (line 448) already passes industry name, category, and tips. Extend it to also pass:
The business's actual service list with prices and complexity flags
Their specific knowledge gaps (what callers asked that the AI couldn't answer)
Their specific call patterns (busiest hours, most-requested services, common intents)
Their current checklist completion state
Whether they're solo or have a team
Their AI behavior mode (full_service vs callback_only)
The system prompt (line 458) should be enhanced:
Instead of generic "Good conversion rate: 30-50%", include the business's ACTUAL rate and compare: "Your conversion rate is 28%. For auto repair shops at your stage (building), 35-45% is typical. Here's why yours might be lower..."
Reference their actual services by name: "Your 'General Repair' service is set to 'quote required' but you haven't added price factors. Callers asking about repairs get no pricing guidance."
Reference their actual gaps: "Callers asked about 'diesel engines' 4 times this week and your AI couldn't answer. Add this to your FAQs."
Frontend improvements (BusinessPartnerPage.tsx):
The STAGE_DESCRIPTIONS (line 13-19) should be business-aware:
Instead of "Let's get your AI assistant set up and ready for calls"
Show: "Let's get Smiles AutoWorks answering calls. You have 3 services configured -- add FAQs and connect your calendar to go live."
At the "growing" stage: "Smiles AutoWorks handled 47 calls last week. Your oil change bookings are converting well, but brake inspection inquiries are dropping off -- let's fix that."
Files:
supabase/functions/partner-analysis/index.ts -- richer context document with actual business data
src/pages/app/BusinessPartnerPage.tsx -- business-aware stage descriptions
src/hooks/useBusinessPartner.ts -- pass more tenant-specific data

Gap 6: Help Center -- Business-Aware Guidance
Previous plan: Industry-specific help content.
Upgraded plan: Help content should reflect what the business HAS and HASN'T done:
If calendar isn't connected: Prominently show "How to connect your calendar" guide
If they have 0 FAQs: Show "Why FAQs matter -- your AI answered 15 calls but couldn't help with 4 questions"
If they're in callback-only mode: Show guides about maximizing callback conversion, not booking optimization
Hide guides for features they don't have enabled (don't show "Managing your dispatch queue" to a salon)
This means HelpGuideDashboard filters and prioritizes content based on the business's actual state, not just their mode.
Files:
src/components/help/HelpGuideDashboard.tsx -- state-aware content filtering and prioritization

Gap 7: Progressive Disclosure -- Complexity From THEIR Data
Previous plan: Introduce a complexityTier based on capabilities.
Upgraded plan: Derive complexity from actual operational data, not just capability flags:
Simple (solo, early stage):
  - 1 location, 0-1 staff, < 10 services, no fleet, no impound
  - Collapse advanced settings, minimal sidebar, focused checklist

Standard (small team, moderate volume):
  - 1-2 locations, 2-5 staff, 10-30 services, calendar connected
  - Full sidebar, standard settings, all checklist items

Complex (multi-location, high volume):
  - 3+ locations, 5+ staff, fleet management, impound, catering
  - Everything visible, advanced analytics, team management
The tier is computed from real counts (tenant_locations, tenant_users, services, capability flag count), not just hardcoded assumptions.
Files:
src/hooks/useIndustryContext.ts or src/hooks/useCapabilities.ts -- add complexityTier computed from real data
Sidebar, settings, and brain editors use this tier for progressive disclosure

Gap 8: Estimates Gating (Same as Previous Plan)
Remove the unconditional workspaceItems.push on line 121 of AppSidebar.tsx. Only show when caps.hasEstimates || caps.hasPhoneQuotes.
Files: src/components/layouts/AppSidebar.tsx

New Addition: Business Context Hook
Create a useBusinessContext() hook that composes everything a component needs to be business-aware. This is the single source of truth for all business-specific UI decisions:
useBusinessContext() returns:
  -- From useIndustryContext (Phase 1):
  slug, category, mode, terminology, catalog

  -- From useCapabilities (existing):
  all capability flags, derivedPrimaryMode

  -- NEW -- From tenant data queries:
  serviceCount: number
  serviceNames: string[]          // actual service names for display
  faqCount: number
  gapCount: number                // unresolved knowledge gaps
  topGaps: string[]               // most frequent unanswered questions
  hasCalendar: boolean
  staffCount: number
  locationCount: number
  recentCallCount: number         // last 7 days
  conversionRate: number          // last 30 days
  hangupRate: number
  topRequestedServices: string[]  // from call data
  aiBehaviorMode: string          // full_service vs callback_only
  complexityTier: 'simple' | 'standard' | 'complex'

  -- Computed:
  isNewBusiness: boolean          // < 5 calls total
  hasDataForAnalysis: boolean     // enough calls for Partner to be useful
  missingCritical: string[]       // "no_services", "no_hours", "no_faqs", "no_calendar"
This hook is lightweight -- it reuses existing queries from useBrainCompletion, useConversionMetrics, useKnowledgeGaps, etc. It's a composition layer, not new data fetching.
Every component in the platform can import useBusinessContext() and make decisions based on THIS business's actual state.
Files:
New: src/hooks/useBusinessContext.ts -- composes existing hooks into business-aware context

Implementation Order for Claude Code
Step 1: Foundation
Create useBusinessContext() hook (composes existing hooks)
Add complexityTier computation from real data
Create testScenarioBuilder.ts (builds scenarios from services + gaps + industry)
Create setupStepBuilder.ts (builds dynamic checklist from tenant state)
Step 2: Sidebar 5. Gate "Estimates" by capability in AppSidebar.tsx (remove line 121 unconditional push) 6. Make sidebar subtitle business-aware (tagline or industry fallback)
Step 3: Dashboard 7. Dynamic checklist in SetupProgressChecklist.tsx using setupStepBuilder 8. Business-aware metric labels in MetricsGrid.tsx 9. Dynamic quick action label in ServiceDashboardLayout.tsx
Step 4: Simulator 10. Business-aware test scenarios in SuggestedTestsBanner.tsx using testScenarioBuilder
Step 5: Business Partner 11. Expand partner-analysis/index.ts context document with actual services, gaps, call patterns 12. Business-aware stage descriptions in BusinessPartnerPage.tsx
Step 6: Help Center 13. State-aware content filtering in HelpGuideDashboard.tsx
Step 7: Progressive Disclosure 14. Apply complexity tier to sidebar, settings, and brain editors

Files to Read First
Before starting, read these files to understand existing data access patterns:
src/hooks/useBusinessContext.ts           (NEW -- will be created)
src/hooks/useIndustryContext.ts           (from Phase 1 -- foundation)
src/hooks/useCapabilities.ts              (capability resolution -- 294 lines)
src/hooks/useBusinessPartner.ts           (health score, stage -- 186 lines)
src/hooks/useBrainCompletion.ts           (brain completion stats)
src/hooks/useKnowledgeGaps.ts             (unanswered caller questions)
src/hooks/useConversionMetrics.ts / useIntelligence.ts  (call metrics)
src/hooks/useAIReadinessV2.ts             (readiness flags)
src/config/industryBrainConfig.ts         (from Phase 1 -- industry config)
src/data/industryCatalog.ts               (80+ industry definitions)
src/components/layouts/AppSidebar.tsx      (sidebar -- 209 lines)
src/components/dashboard/SetupProgressChecklist.tsx  (checklist -- 289 lines)
src/components/dashboard/MetricsGrid.tsx   (metrics -- 205 lines)
src/components/simulator/SuggestedTestsBanner.tsx  (test banner -- 139 lines)
src/pages/app/BusinessPartnerPage.tsx      (partner page -- 107 lines)
supabase/functions/partner-analysis/index.ts  (AI analysis -- 543 lines)
src/components/help/HelpGuideDashboard.tsx  (help content -- 297 lines)
src/components/settings/SettingsSidebar.tsx  (settings nav -- 146 lines)
src/contexts/AuthContext.tsx               (tenant data access)
What Does NOT Change
Database schema -- no migrations needed
Edge functions other than partner-analysis -- untouched
ElevenLabs integration -- untouched
Core data hooks (useServices, useSettings, useCalendarConnections) -- reused, not modified
The dispatch experience (Hawk's Towing) -- must continue working perfectly
Authentication, subscription, and billing flows -- untouched
Testing Checklist
Smiles AutoWorks (auto repair, 3 services, solo): Simulator shows "How much for an oil change?" (from actual services). Checklist says "Add common customer questions" (they have 0 FAQs). Partner references their actual services by name. Sidebar hides "Estimates" if not enabled. Complexity tier = simple.
Hawk's Towing (dispatch, multi-truck): Everything unchanged. Simulator shows towing scenarios. Estimates hidden. Dispatch and Fleet visible.
New salon (0 services, 0 calls): Simulator falls back to industry defaults ("I'd like a haircut"). Checklist shows all setup steps. Partner says "Let's get your salon set up." Complexity = simple.
Established restaurant (50+ services, 200+ calls): Simulator references actual menu items. Partner analyzes real conversion data. Complexity = standard or complex based on locations/staff.
Multi-location towing with impound: All advanced features visible. Complexity = complex. Full sidebar. All settings expanded.

