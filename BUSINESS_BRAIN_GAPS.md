# Business Brain Gaps Page

## Overview

The **Business Brain Gaps** page provides analytics and aggregated insights into knowledge gaps detected during AI calls. It surfaces where the AI lacked information to confidently answer customer questions, with deep links to fix each issue.

## Implementation

### Core Components

1. **`useKnowledgeGaps` Hook** ([src/hooks/useKnowledgeGaps.ts](src/hooks/useKnowledgeGaps.ts))
   - Queries `knowledge_gaps` table for unresolved gaps
   - Aggregates data by gap_type
   - Computes total counts, occurrences, and priorities
   - Returns top 10 most frequent gaps

2. **`BusinessBrainGapsPage` Component** ([src/pages/app/BusinessBrainGapsPage.tsx](src/pages/app/BusinessBrainGapsPage.tsx))
   - Full analytics view using new layout primitives
   - Shows stats, gap types overview, and top frequent gaps
   - Deep links to fix pages for each gap type
   - Empty state when no gaps exist
   - "What to Do Next" guide for fixing gaps

### Route

- **URL:** `/app/business-brain/gaps`
- **Layout:** Uses `AppLayout` (authenticated)
- **Navigation:** Linked from Business Brain overview stats card

## Data Source

### Database Table: `knowledge_gaps`

**Schema:**
```sql
CREATE TABLE knowledge_gaps (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN (
    'missing_policy',
    'missing_pricing',
    'missing_service_area',
    'unanswered_question',
    'missing_hours',
    'missing_faq',
    'other'
  )),
  description TEXT NOT NULL,
  customer_question TEXT,
  ai_session_id UUID,
  priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**How Gaps Are Created:**
- Detected during AI call sessions (via `elevenlabs-webhook`)
- Created when AI cannot confidently answer a question
- Deduplicated by matching similar gaps (increments `occurrence_count`)
- Prioritized based on context (1=low, 2=medium, 3=high)

## Features

### 1. Stats Overview

Three stat cards display:
- **Total Gaps:** Count of unique unresolved knowledge gaps
- **Total Occurrences:** Sum of all `occurrence_count` (how many times gaps were hit)
- **Gap Types:** Number of distinct gap categories

**Color-coded variants:**
- Green (success): No gaps
- Amber (warning): Some gaps exist
- Red (destructive): Many gaps (>10 occurrences)

### 2. Gaps by Type

Aggregated view of gaps grouped by category:
- Shows total count, occurrences, and highest priority per type
- Each card is clickable and navigates to the fix page
- Color-coded by gap type (rose for policy, amber for pricing, etc.)
- Action button shows what to do (e.g., "Add Pricing", "Define Service Area")

**Gap Types and Deep Links:**
```typescript
const deepLinks = {
  missing_policy: "/app/settings",          // Policies tab
  missing_pricing: "/app/services",         // Services with pricing
  missing_service_area: "/app/settings",    // Service area config
  unanswered_question: "/app/business-brain", // Add to FAQs
  missing_hours: "/app/settings",           // Business hours
  missing_faq: "/app/business-brain",       // FAQ management
  other: "/app/business-brain"              // General knowledge base
};
```

### 3. Most Frequent Gaps

Top 10 gaps sorted by:
1. **Priority** (high > medium > low)
2. **Occurrence count** (how many times asked)

Each gap displays:
- Icon and color-coded by type
- Description of the gap
- Priority badge (High/Medium/Low)
- Occurrence count badge
- Latest customer question (if available)
- "Fix" button with deep link

### 4. What to Do Next

Step-by-step guide for fixing gaps:
1. Review gaps by type above
2. Add missing information (FAQs, pricing, policies)
3. Test your AI in the simulator

Includes quick link to simulator for testing.

### 5. Empty State

When no gaps exist:
- Checkmark icon with success message
- "No Knowledge Gaps!" heading
- Links to Knowledge Base and Simulator
- Encourages testing to find potential gaps

## Visual Design

Uses new **design system primitives**:
- `PageContainer`: Consistent padding and max-width
- `PageHeader`: Title, description, action button
- `StatCard`: Premium metric cards with variants
- `SectionCard`: Elevated cards for sections
- `SkeletonStatCard` / `SkeletonCard`: Loading states

**Color Coding:**
- **Missing Policy:** Rose (text-rose-400, bg-rose-500/15, border-rose-500/30)
- **Missing Pricing:** Amber (text-amber-400, bg-amber-500/15, border-amber-500/30)
- **Service Area:** Blue (text-blue-400, bg-blue-500/15, border-blue-500/30)
- **Unanswered Question:** Purple (text-purple-400, bg-purple-500/15, border-purple-500/30)
- **Missing Hours:** Cyan (text-cyan-400, bg-cyan-500/15, border-cyan-500/30)
- **Missing FAQ:** Orange (text-orange-400, bg-orange-500/15, border-orange-500/30)
- **Other:** Gray (text-gray-400, bg-gray-500/15, border-gray-500/30)

**Priority Colors:**
- **Low (1):** Blue badge
- **Medium (2):** Amber badge
- **High (3):** Rose badge

## User Flow

### Discovering Gaps

1. User sees gaps count on Business Brain overview page
2. Clicks "View Analytics →" link
3. Lands on `/app/business-brain/gaps`

### Fixing Gaps

1. User reviews "Gaps by Type" section
2. Clicks on a gap category (e.g., "Missing Pricing")
3. Redirected to `/app/services` to add pricing
4. After adding pricing, gap is automatically resolved
5. Returns to gaps page to verify fix

### Testing Fixes

1. User clicks "Open Simulator" button
2. Tests AI with similar questions
3. Verifies AI can now answer confidently

## Data Flow

```
AI Call Session
     ↓
Customer asks question AI can't answer
     ↓
elevenlabs-webhook detects knowledge gap
     ↓
Inserts to knowledge_gaps table (or increments occurrence_count)
     ↓
useKnowledgeGaps hook fetches and aggregates
     ↓
BusinessBrainGapsPage displays stats and top gaps
     ↓
User clicks deep link to fix page
     ↓
User adds missing information
     ↓
Gap marked as resolved (via KnowledgeGapQueue or automatically)
```

## Hook API

### `useKnowledgeGaps()`

**Returns:**
```typescript
{
  unresolvedGaps: KnowledgeGap[];          // All unresolved gaps
  gapTypeAggregates: GapTypeAggregate[];   // Grouped by type
  topGaps: TopGap[];                       // Top 10 by priority + occurrences
  totalUnresolvedCount: number;            // Count of unique gaps
  totalOccurrences: number;                // Sum of occurrence_count
  loading: boolean;                        // Loading state
  error: Error | null;                     // Error if any
  refetch: () => void;                     // Refetch function
}
```

**Cache Settings:**
- `staleTime: 30_000` (30 seconds)
- `refetchOnWindowFocus: true`
- Query key: `["knowledge-gaps-aggregated", tenant_id]`

### Helper Functions

**`getGapTypeLabel(gapType: string): string`**
- Converts gap_type to human-readable label
- Example: `"missing_pricing"` → `"Missing Pricing"`

**`getGapTypeDeepLink(gapType: string): string`**
- Returns fix page URL for gap type
- Example: `"missing_pricing"` → `"/app/services"`

**`getGapTypeAction(gapType: string): string`**
- Returns action label for button
- Example: `"missing_pricing"` → `"Add Pricing"`

## Integration Points

### Business Brain Overview

**Stats Card:**
- Shows gap count with amber highlight if >0
- Links to gaps analytics page
- Located at: [BusinessBrainPage.tsx:309-337](src/pages/app/BusinessBrainPage.tsx#L309-L337)

### Knowledge Gap Queue

**Queue Component:**
- Lists individual gaps with resolve/dismiss actions
- Allows adding gaps as FAQs/policies/objections
- Located at: [KnowledgeGapQueue.tsx](src/components/knowledge/KnowledgeGapQueue.tsx)
- Linked from Business Brain overview (bottom of page)

### AI Readiness System

**Related but separate:**
- `useAIReadinessV2` checks for missing data proactively
- `knowledge_gaps` captures reactive gaps from actual calls
- Both contribute to AI quality, but measured differently

## Example Scenarios

### Scenario 1: New Business with Missing Pricing

**Initial State:**
- 5 calls where customers asked "How much does X cost?"
- 3 unique gaps created, total 5 occurrences
- Gap type: `missing_pricing`

**Gaps Page Shows:**
- Stats: 3 total gaps, 5 occurrences
- "Missing Pricing" card: 3 gaps, 5 occurrences, High priority
- Top gap: "Customer asked about service pricing (5x)"
- Deep link: `/app/services`

**User Action:**
- Clicks "Add Pricing" button
- Adds pricing to all services
- Gaps auto-resolved on next call

### Scenario 2: Unanswered FAQs

**Initial State:**
- 10 calls with questions like "Do you offer emergency service?"
- 1 gap with 10 occurrences
- Gap type: `unanswered_question`

**Gaps Page Shows:**
- Stats: 1 total gap, 10 occurrences
- "Unanswered Question" card: 1 gap, 10 occurrences, Medium priority
- Top gap: "Do you offer emergency service? (10x)"
- Deep link: `/app/business-brain`

**User Action:**
- Clicks "Add FAQ" button
- Adds FAQ about emergency service
- Gap marked as resolved

### Scenario 3: No Gaps (Healthy State)

**State:**
- No unresolved gaps
- AI confidently answering all questions

**Gaps Page Shows:**
- Empty state with checkmark
- "No Knowledge Gaps!" message
- Links to test AI and view knowledge base

## Performance Considerations

- **Single query** fetches all gaps, then aggregates in-memory (fast)
- **30s cache** prevents excessive database hits
- **Query key includes tenant_id** for multi-tenant isolation
- **Sorted by priority + occurrences** ensures most important gaps shown first

## Non-Negotiables Met

✅ **No hardcoded demo data** - All data from real `knowledge_gaps` table
✅ **No new tables** - Uses existing `knowledge_gaps` schema
✅ **Deep links to fix pages** - Each gap type maps to specific settings/config page
✅ **Behavior driven by real calls** - Gaps created during actual AI sessions
✅ **Follows design system** - Uses PageContainer, PageHeader, StatCard, SectionCard
✅ **No breaking changes** - Additive feature, doesn't modify existing flows

## Files Created

1. **Hook:** `src/hooks/useKnowledgeGaps.ts` - Data fetching and aggregation
2. **Page:** `src/pages/app/BusinessBrainGapsPage.tsx` - Full analytics view
3. **Documentation:** `BUSINESS_BRAIN_GAPS.md` - This file

## Files Modified

1. **`src/App.tsx`** - Added route for `/app/business-brain/gaps`
2. **`src/pages/app/BusinessBrainPage.tsx`** - Added link to gaps analytics page

## Next Steps (Optional Enhancements)

1. **Trend Analysis** - Show gap counts over time (7-day, 30-day charts)
2. **Email Notifications** - Alert when high-priority gaps reach threshold
3. **Auto-Resolution** - Automatically mark gaps as resolved when matching FAQ/policy added
4. **Bulk Actions** - "Add All as FAQs" button for quick resolution
5. **Export Report** - Download CSV of gaps for offline analysis
6. **Gap Prevention** - Suggest proactive FAQs based on industry patterns

## Testing Checklist

- [ ] Create tenant with knowledge gaps in database
- [ ] Navigate to `/app/business-brain/gaps`
- [ ] Verify stats display correctly (counts, occurrences)
- [ ] Verify gap type cards show aggregated data
- [ ] Click gap type card, verify deep link navigation
- [ ] Verify top gaps list shows highest priority first
- [ ] Verify occurrence count badges display correctly
- [ ] Test empty state (tenant with no gaps)
- [ ] Verify loading skeletons appear on slow connection
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Verify "Open Simulator" button works
- [ ] Verify "View Knowledge Base" button works

## Success Metrics

- Users can identify knowledge gaps in <10 seconds
- Deep links reduce time-to-fix by 50% (no searching for settings)
- Gap resolution rate increases (users fix gaps instead of ignoring)
- AI confidence score improves as gaps are resolved
