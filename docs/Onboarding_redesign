
Onboarding Redesign: From Generic Steps to Industry-Intelligent Setup

The Problem Today

The current onboarding has 11 steps that are mostly mode-aware but not industry-aware. After selecting "Auto Repair" as their industry, an owner still sees generic labels like "How does your business operate?" with toggle switches they may not understand. Then after onboarding, they land on a 3-step Setup Wizard (Connect Phone, Configure AI, Go Live) where "Configure AI" just says "open Business Brain" -- and the Brain itself is the confusing generic experience Claude Code is currently fixing.

The result: a business owner finishes onboarding, lands on a dashboard that tells them their "AI Readiness" is 62%, with a list of abstract flags like "missing_pricing" and "few_faqs" -- and they have no idea what to do next or how any of this connects to their actual business.

The Vision: "Ready in Under an Hour"

The onboarding should feel like the platform already knows how their specific business works. When someone selects "Auto Repair," every subsequent screen should speak auto repair language, show auto repair examples, and only ask questions that matter to an auto repair shop. When they finish, the post-onboarding experience should hand-hold them through the exact remaining setup steps for THEIR business, not a generic checklist.

What Changes

Phase 1: Smarter Onboarding Flow (Steps Restructure)

Current 11 steps get restructured into a tighter, more intelligent flow:

Step 1: "What's your business?" (Identity + Industry combined)





Business name input (stays the same)



Industry selector (stays the same -- already has 80+ industries)



Mode is auto-derived from industry (already works)



Remove the manual BusinessModeSelector toggle -- let the industry pick determine the mode automatically. Only show mode selector as a fallback "none of these fit" option.

Step 2: "Tell us how you operate" (Discovery -- redesigned)





Current ScenarioDiscovery shows abstract toggle switches. Redesign to feel like a conversation.



Instead of "Do you offer mobile or on-site services?" as a generic toggle, show industry-specific phrasing:





Auto repair: "Do you offer mobile mechanic services?"



Salon: "Do you offer mobile or at-home appointments?"



Plumber: "Do you travel to customer locations?" (obviously yes, pre-checked)



Towing: skip this question entirely (always mobile)



Reduce the number of questions by pre-answering obvious ones based on industry. A plumber doesn't need to answer "Do you travel to customer locations?" -- it's pre-set to yes. A towing company doesn't need "Do you handle same-day emergencies?" -- of course they do.



Group remaining questions into 2-3 cards instead of a long scrollable list. Each card focuses on one theme: "Your Services," "Your AI's Behavior," "Advanced Options."

Step 3: "Review your services" (Services Preview -- enhanced)





Already exists. Keep it but make the inline pricing UX match the Claude Code changes (fixed / starting at / quote required per service).



Show industry-specific placeholder text and examples from the catalog.

Step 4: "Your schedule" (Scheduling -- simplified)





Combine hours + scheduling preferences into one cleaner screen.



Auto-skip this step for dispatch businesses (they're typically 24/7 or set via the "operates 24 hours" toggle in discovery).

Step 5: "Your AI's personality" (Communication -- simplified)





Keep the AI booking mode, missed call behavior, tone selectors.



Remove "follow-up cadence" and "unknown question behavior" from onboarding -- these are advanced settings that belong in the Business Brain. Most owners don't know what they want here yet.



Auto-default everything based on industry (already partially works via getDefaultCommunicationPrefs). Extend defaults to be slug-level, not just mode-level.

Step 6: "Review and launch" (Confirm -- enhanced)





Show a clear summary card with industry-specific language.



Instead of a wall of text, show 4-5 cards: "Your Business," "Your Services (X configured)," "Your AI Behavior," "Your Hours."



Each card has a small edit icon to jump back to that step.

Removed from onboarding (moved to post-onboarding Brain):





Business Details form (team size, years in business, pricing position) -- this is useful data but it stalls the flow and doesn't affect initial setup. Capture it later in the Brain or via the AI Brain Builder conversation.



Coverage / Service Area -- too detailed for onboarding. Pre-set a default from the location they entered. Let them refine in the Brain.



Policies preview -- pre-load from industry template (already happens). Don't ask them to edit during onboarding. They can refine in the Brain.



FAQ preview -- same as policies. Pre-load, don't ask to edit during onboarding.

This reduces onboarding from 11 steps to 6 steps. Faster, less overwhelming.

Phase 2: Post-Onboarding Setup Wizard Redesign

After onboarding, the owner lands on the Dashboard with the current 3-step SetupWizard: Connect Phone, Configure AI, Go Live.

Redesign the middle step ("Configure AI") to be industry-intelligent:

Instead of just showing "AI Readiness: 62%" with a "Open Business Brain" button, show a guided checklist of 3-5 specific items tailored to their industry:

Auto Repair would see:





"Add your shop's services and rates" (links to services section)



"Set your shop hours" (links to hours -- may already be done from onboarding)



"Add common customer questions" (links to FAQs with auto-repair examples pre-loaded)



"Connect your calendar for bookings" (if they chose auto-book mode)

Towing would see:





"Set your tow rates and hookup fees" (links to dispatch pricing)



"Define your coverage zone" (links to service area)



"Configure your fleet" (links to fleet setup, if they have multiple trucks)

Salon would see:





"Add your salon services and pricing" (links to services)



"Connect your calendar" (links to calendar)



"Add stylist/team member info" (if multi-staff)

Each item shows completion state (checkmark or not) and links directly to the right section in the Business Brain. The readiness score still exists but is secondary -- the checklist IS the path.

Phase 3: Onboarding-to-Brain Handoff

When a business finishes onboarding and the Setup Wizard, they should be able to seamlessly continue configuring in the Business Brain without feeling lost.

Changes to the existing GuidedSetupOverlay:





Replace the current generic 3-4 priority steps with industry-specific steps from the new industryBrainConfig.ts (that Claude Code is building).



The overlay should say things like "Let's finish setting up your auto repair shop" not "Let's finish setting up."

Changes to OnboardingComplete:





The "Recommended next steps" list should be industry-specific, not just mode-specific.



Auto repair: "Make a test call to hear your AI," "Add your most popular services," "Set your shop hours"



Towing: "Make a test call to hear your AI," "Set up your tow rates," "Define your service area"

What Does NOT Change





The database schema -- no migrations needed



Edge functions -- no changes



The industry catalog (industryCatalog.ts) -- already has 80+ industries, stays as-is



The template resolver (resolveIndustryTemplate) -- already loads industry-specific services, FAQs, policies



The scenario questions data structure -- questions stay, just get filtered/pre-answered more aggressively



The tenant creation edge function (create-tenant) -- same payload



Subscription and Twilio provisioning logic -- untouched

Technical Details

Files to Modify







File



Change





src/pages/app/OnboardingPage.tsx (896 lines)



Reduce ALL_STEPS from 11 to 6, remove details/coverage/policies-preview/faqs-preview steps, combine identity+mode into one cleaner step, auto-derive mode from industry





src/components/onboarding/ScenarioDiscovery.tsx



Pre-answer obvious questions per industry slug, reduce visible questions, group into themed cards instead of long scroll list





src/lib/scenarioQuestions.ts



Add preAnsweredFor field to questions so industries can auto-set answers. Add slug-level filtering beyond just industryFilter





src/components/onboarding/CommunicationPreferences.tsx



Remove follow-up cadence and unknown question behavior from onboarding UI (keep in Brain). Add slug-level defaults.





src/components/onboarding/OnboardingComplete.tsx



Make next steps industry-specific using useIndustryContext (from Claude Code's changes)





src/components/dashboard/SetupWizard.tsx



Replace generic "Configure AI" step with industry-specific checklist items





src/components/dashboard/ConfigureAIStep.tsx



Show 3-5 industry-specific action items instead of just readiness score + "Open Brain" button





src/components/brain/GuidedSetupOverlay.tsx



Use industry-specific priority steps from industryBrainConfig

New Files







File



Purpose





src/config/industryOnboardingConfig.ts



Maps industry slugs/categories to: pre-answered scenario questions, reduced question lists, post-onboarding checklist items, communication pref defaults

Dependency on Claude Code's Work

This plan depends on the useIndustryContext hook and industryBrainConfig.ts that Claude Code is currently building. Those provide the foundation for resolving industry-specific labels and configuration. The onboarding changes should be implemented AFTER Claude Code's work is merged.

Implementation Order





Create industryOnboardingConfig.ts with per-industry pre-answers and question filtering



Restructure OnboardingPage.tsx to 6 steps (remove 5 steps, combine identity+industry)



Update ScenarioDiscovery.tsx to pre-answer and reduce questions



Simplify CommunicationPreferences.tsx for onboarding context



Redesign ConfigureAIStep.tsx with industry-specific checklist



Update OnboardingComplete.tsx and GuidedSetupOverlay.tsx with industry-aware next steps
