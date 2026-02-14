

# Business Brain Editor Cleanup: Clean, Professional Layout

## The Problem

When you click into any tab and select an item, you're hit with 3-5 colored callout boxes stacked vertically BEFORE you ever reach the actual form:

1. "What is this?" box (teal border, Info icon)
2. "Import your service list" banner (teal dashed border, prominent)
3. "Your service catalog IS your pricing config" guidance box (teal border)
4. "What the AI tells customers" preview box (teal/green tinted)
5. Then finally the actual catalog/form

This happens across almost every editor. The Service Area page has a similar problem: ServiceAreaPreview card + ServiceAreaGuidance card + "How your AI uses this" callout + the actual form fields.

The result: you scroll through walls of instructional boxes to find the thing you actually need to fill out.

## The Fix: Form-First, Help-Second

Every editor should follow one pattern:
- **Form fields first** -- the thing the owner came to fill out
- **Contextual help inline** -- small helper text beneath fields, not big callout boxes above
- **Import/upload tools** -- compact buttons in the header row, not banners
- **AI preview** -- collapsed by default at the bottom, expandable

## Phase 1: Create a Unified Editor Header Pattern

Create a small `EditorHeader` component that replaces the per-editor "What is this?" boxes. It renders:
- A one-line description (plain text, not a box)
- Action buttons inline (Import, CSV, Paste from POS)

This replaces the current pattern where each editor builds its own explanation card with `<Info>` icon, bold "What is this?", paragraph, tip.

**New file:** `src/components/brain/shared/EditorHeader.tsx`

## Phase 2: Clean Up ServiceCatalogEditor

The biggest editor. Current layout has 4 boxes before the catalog list.

**Changes:**
- Remove the "What is this?" callout box (lines 587-606) -- replace with a one-line description under the catalog header
- Remove the `QuotingBehaviorGuidance` callout (line 616-618) -- this info is already implied by the price type dropdown
- Move `InlineUploadButton` from a prominent banner to a compact button in the header row next to "Paste from POS" and "CSV Import"
- Move the "What the AI tells customers" preview to a collapsible section at the bottom, default collapsed
- Keep all form fields, service list, expand/collapse behavior exactly as-is

**File:** `src/components/brain/ServiceCatalogEditor.tsx`

## Phase 3: Clean Up ServiceAreaManager

Current layout: ServiceAreaPreview card + ServiceAreaGuidance card (with "How your AI uses this" sub-box) + form fields.

**Changes:**
- Remove `ServiceAreaGuidance` import and rendering -- the form labels are self-explanatory
- Keep `ServiceAreaPreview` but make it a compact inline summary (1 line, not a full Card with CardHeader)
- Remove the `FieldHelper` callout under the out-of-area message textarea -- use a simple `placeholder` instead
- Keep all form inputs, chip inputs, coverage mode selector exactly as-is

**File:** `src/components/brain/ServiceAreaManager.tsx`

## Phase 4: Clean Up BusinessHoursManager

Review and remove any "What is this?" or guidance boxes. Hours setup is self-explanatory.

**File:** `src/components/brain/BusinessHoursManager.tsx`

## Phase 5: Clean Up AIScriptsEditor (Greeting Script)

Remove "What is this?" box. The title "Greeting Script" and the textarea label are enough context.

**File:** `src/components/brain/AIScriptsEditor.tsx`

## Phase 6: Clean Up BusinessPoliciesEditor (Policies)

Remove the `PoliciesGuidance` card with its "How your AI uses this" sub-box. Keep the actual policy form fields.

**File:** `src/components/brain/BusinessPoliciesEditor.tsx`

## Phase 7: Clean Up AINeverPromiseEditor (Guardrails)

Remove explanation box. "Things your AI should never promise" is self-explanatory.

**File:** `src/components/brain/AINeverPromiseEditor.tsx`

## Phase 8: Clean Up RequiredQuestionsEditor

Remove guidance box. "Questions to ask on every call" is clear from the title.

**File:** `src/components/settings/RequiredQuestionsEditor.tsx`

## Phase 9: Clean Up FAQEditor and ObjectionEditor

Both have explanation boxes. Remove them -- "Common Questions and Answers" and "When Customers Push Back" are self-descriptive.

**Files:** `src/components/brain/BusinessFAQEditor.tsx`, `src/components/brain/BusinessObjectionEditor.tsx`

## Phase 10: Clean Up MenuCatalogEditor and DispatchServiceCatalog

Same pattern as ServiceCatalogEditor -- remove "What is this?" boxes, move import tools to header row.

**Files:** `src/components/brain/MenuCatalogEditor.tsx`, `src/components/brain/dispatch/DispatchServiceCatalog.tsx`

## Phase 11: Clean Up Remaining Editors

Apply the same form-first pattern to all remaining editors that have guidance boxes:
- `DispatchPricingEditor` -- remove "What is this?" box
- `DailySpecialsEditor` -- remove explanation box  
- `PriceModifiersEditor` -- remove guidance box
- `CustomKnowledgeEditor` -- remove explanation box
- `CustomPoliciesEditor` -- remove explanation box

## Phase 12: Simplify QuoteReadinessCard Banner

The `QuoteReadinessCard` at the top of the Services tab is useful but should be more compact:
- When ready (100%): single line green text, no card border
- When not ready: compact amber bar with issue count, expandable

**File:** `src/components/brain/QuoteReadinessCard.tsx`

## Phase 13: Simplify ServiceAreaPreview

Currently a full Card with CardHeader. Convert to a simple inline summary line: "Service Area: Within 100 miles of Wrightstown, NJ" -- no card wrapper.

**File:** `src/components/debug/ServiceAreaPreview.tsx`

---

## Design Principle Applied

Before (per editor):
```
[What is this? -- callout box]
[Import banner -- dashed border]  
[Pricing guidance -- callout box]
[AI preview -- tinted box]
[Actual form/catalog]
```

After (per editor):
```
Header: "Services Catalog" + [Import] [CSV] [+ Add] buttons
Subtitle: "13 services -- click to expand and edit"
[Actual form/catalog]
[Collapsed: "Preview what AI says" toggle]
```

## What Will NOT Change

- All form fields, inputs, dropdowns, and their behavior
- All save/create/delete logic and hooks
- All data sent to ElevenLabs
- Database schema
- Edge functions
- The sidebar navigation structure (already cleaned up)
- Mode-awareness and visibility rules
- The `BrainEditorRenderer` switch statement

