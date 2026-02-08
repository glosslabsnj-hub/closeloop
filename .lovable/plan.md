
# Business Brain Redesign Plan

## Overview
A complete visual and structural redesign of the Business Brain to make it dramatically easier for business owners to understand and configure their AI assistant — without changing any underlying logic or ElevenLabs integration.

---

## Design Philosophy

### Core Principles
1. **Progressive Disclosure**: Show essentials first, reveal advanced options on demand
2. **Visual Clarity**: Clear visual hierarchy separating "must-do" from "optional" 
3. **Guided Setup**: Wizard-like experience for first-time users, power-user mode for experienced owners
4. **Contextual Help**: Inline help that doesn't overwhelm — hover/click to learn more
5. **Industry-Native Language**: Every label, example, and hint speaks the user's industry

---

## Structural Changes

### 1. Two-Mode Interface: Setup Mode vs Edit Mode

**Setup Mode** (for new/incomplete tenants):
- Step-by-step guided flow with progress indicator
- One section at a time, "Next" button progression
- Celebratory completion state with suggested next steps

**Edit Mode** (for configured tenants):
- Current tab-based navigation (refined)
- Quick-access cards instead of collapsible accordions
- Section summary previews without expanding

### 2. Simplified Tab Structure (8 → 6 Tabs)

Current tabs are good but can be consolidated:

| Current | New | Reasoning |
|---------|-----|-----------|
| Identity | **About** | Simpler label |
| Operations | **Hours** | Keep as-is |
| Offerings | **Pricing** | More intuitive |
| Coverage & ETA | **Service Area** | Combine display |
| Calendar | (Merged into Service Area) | Related to availability |
| Policies | **Rules** | Shorter label |
| Knowledge | **Training** | More intuitive |
| AI Setup | **Voice** | Clearer purpose |

### 3. Card-Based Section Display (Replace Accordions)

Instead of collapsible sections that hide content, use **summary cards** that show:
- Section title with icon
- 1-line status ("3 services configured" or "Not set up")
- Quick-edit button that opens a modal/drawer
- Completion indicator (checkmark or warning)

```text
┌──────────────────────────────────────────────────┐
│ 🏷️ Your Services                    ✓ Complete  │
│ 5 services • Starting at $85                    │
│                                    [Edit →]     │
└──────────────────────────────────────────────────┘
```

### 4. Floating Help System (Replace Large Helper Boxes)

Move the section helper content from a large box at the top to:
- **Floating help icon** (?) next to each section title
- **Tooltip on hover** with 1-line explanation
- **"Learn more" link** that opens a slide-out panel with full details

This reclaims ~100px of vertical space per section.

---

## Visual Hierarchy Changes

### Essential vs Advanced Sections

Group sections visually:

**Essential (Always Visible)**
- Primary sections with full styling
- Colored icons, clear labels
- Progress indicators

**Advanced (Collapsed by Default)**
- Grouped under "Advanced Settings" accordion
- Muted styling until expanded
- "Most businesses don't need to change these"

### Industry-Specific Grouping

For dispatch mode, show sections in logical operation order:
1. Services & Pricing → What you charge
2. Service Area & ETA → Where you go, how long it takes  
3. Dispatch Rules → How jobs get routed
4. Impound Lot → Storage/release specifics

For food mode:
1. Menu Items → What you serve
2. Ordering → Pickup, delivery, catering
3. Specials & Deals → Promotions
4. Hours → When you're open

---

## New Components

### 1. BrainProgressRing
A circular progress indicator showing overall setup completion:
- Appears in header area
- Shows percentage complete
- Lists top 3 incomplete items on hover

### 2. QuickSetupWizard
A first-time-user experience:
- Modal or full-page wizard
- 5-7 essential steps only
- Skips advanced configuration
- "Finish basic setup" vs "Configure everything"

### 3. SectionSummaryCard
Replaces CollapsibleBrainSection with a status-focused card:
- Shows current state at a glance
- Click to edit (opens drawer/modal)
- Inline validation warnings
- Mode-aware terminology

### 4. InlineFieldHelp
Replaces EditorExplainer with contextual tooltips:
- Small (?) icon next to each field label
- Hover shows brief explanation
- Click shows example + AI usage

### 5. AIPreviewBanner
A persistent banner showing "What your AI will say":
- Appears at bottom of each editor
- Updates in real-time as you type
- Shows actual script the AI will use

---

## Tab-by-Tab Redesign

### About Tab (Identity)
- **Hero section**: Business name + tagline preview
- **Quick stats**: Years in business, location, phone
- **Template selector**: Inline industry templates with preview

### Hours Tab
- **Visual weekly grid** (not just list)
- **Quick toggle** for 24/7 vs custom hours
- **Holiday exceptions** in separate accordion

### Pricing Tab (Offerings)
- **Quote Readiness** card at top (keep current)
- **Service grid** with inline pricing (not accordion)
- **"Add Service" prominent button**
- **Price modifiers** collapsed by default

### Service Area Tab (Coverage + Calendar merged)
- **Map preview** showing coverage (even if static)
- **ETA calculator** inline ("From your shop to [address]: ~X min")
- **Calendar connection** as secondary section
- **Busyness slider** inline

### Rules Tab (Policies)
- **Policy cards** with AI preview
- **Required questions** as checklist
- **Guardrails** simplified to switches

### Training Tab (Knowledge)
- **Review queue** prominent at top if items pending
- **FAQ list** with quick-add
- **Document uploads** in sidebar

### Voice Tab (AI Setup)
- **Live greeting preview** (audio player if available)
- **Script editor** with character count
- **Personality sliders** (friendly ↔ professional)

---

## Implementation Phases

### Phase 1: Foundation (No Logic Changes)
- Create new SectionSummaryCard component
- Create InlineFieldHelp tooltip system
- Create BrainProgressRing component
- Refactor tab labels and consolidation

### Phase 2: Layout Restructure
- Replace CollapsibleBrainSection with SectionSummaryCard
- Move content to modal/drawer editors
- Implement floating help system
- Add Essential vs Advanced grouping

### Phase 3: Guided Experience
- Build QuickSetupWizard for new tenants
- Add completion detection logic
- Create celebratory completion states
- Add "suggested next steps" after setup

### Phase 4: Visual Polish
- Add AIPreviewBanner to all editors
- Refine industry-specific language throughout
- Add map preview for service area
- Add visual weekly grid for hours

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/brain/layout/SectionSummaryCard.tsx` | Status-focused section card |
| `src/components/brain/layout/BrainProgressRing.tsx` | Circular progress indicator |
| `src/components/brain/layout/InlineFieldHelp.tsx` | Tooltip help system |
| `src/components/brain/layout/AIPreviewBanner.tsx` | Real-time AI preview |
| `src/components/brain/wizard/QuickSetupWizard.tsx` | First-time user wizard |
| `src/components/brain/wizard/WizardStep.tsx` | Individual wizard step |
| `src/components/brain/layout/EssentialGroup.tsx` | Essential sections wrapper |
| `src/components/brain/layout/AdvancedGroup.tsx` | Advanced settings accordion |

## Files to Modify

| File | Changes |
|------|---------|
| `BusinessBrainPage.tsx` | New layout structure, tab consolidation |
| `businessBrainNavConfig.ts` | Updated categories, essential/advanced flags |
| `CollapsibleBrainSection.tsx` | Deprecate in favor of SectionSummaryCard |
| `SectionHelper.tsx` | Convert to floating tooltip system |
| `industryHelpers.ts` | Add more mode-specific content |
| All editor components | Add AIPreviewBanner integration |

---

## Key UX Improvements

1. **50% less scrolling** — summary cards show status without expanding
2. **Immediate understanding** — every section shows its current state
3. **No overwhelm** — advanced settings hidden until needed
4. **Clear progress** — owners know exactly what's left to configure
5. **Industry-native** — everything speaks their language (tow operators see "Dispatch Fees", restaurants see "Menu")
6. **Preview everything** — see exactly what the AI will say before saving

---

## What Stays the Same

- All database interactions and save logic
- ElevenLabs integration and prompt building
- Business Brain → AI context pipeline
- Existing validation and error handling
- Multi-tenant architecture
- RLS and security policies
