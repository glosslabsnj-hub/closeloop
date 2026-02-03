

## Custom Knowledge Editor - Full Flexibility Plan

### The Goal

Give business owners a simple, flexible way to add **any information they want** their AI to know - without changing dynamic variables, edge functions, or payloads.

### Why This Works Immediately

The infrastructure already exists and is fully integrated:

1. **`ai_knowledge_base` table** - Already has `type`, `title`, and `content` columns
2. **AI prompt injection** - `buildBusinessContext.ts` already reads this table and injects entries as:
   ```
   ADDITIONAL BUSINESS KNOWLEDGE:
   [POLICY] Warranty Info: All services come with a 90-day warranty...
   [UPSELL] Premium Package: Consider mentioning our premium detail package...
   ```
3. **No backend changes needed** - We're just adding a UI to edit data that's already being used

### User-Friendly Categories (Using Existing Types)

Instead of showing technical type names, we'll present friendly categories:

| What User Sees | Stored As | Example |
|----------------|-----------|---------|
| "Important Info" | `policy` | "We're the only certified dealer in the county" |
| "Things to Mention" | `upsell` | "Don't forget to ask about our loyalty program" |
| "Business Facts" | `policy` | "We've been in business since 1985" |
| "Special Instructions" | `policy` | "Always confirm the vehicle year before quoting" |

### UX Design - Simple & Intuitive

**New Component: `CustomKnowledgeEditor.tsx`**

```
┌────────────────────────────────────────────────────────────────┐
│ 📝 Custom Knowledge                                             │
│ Add any information you want your AI to know                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ AI Preview ─────────────────────────────────────────────────┐
│ │ 💬 "Here's what I know about your business..."               │
│ │ "We're family-owned since 1985, offer a 90-day warranty..."  │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌─ Quick Add Ideas ────────────────────────────────────────────┐
│ │ [+ Years of experience] [+ Warranty info] [+ Certifications] │
│ │ [+ Unique selling points] [+ Special offers] [+ Disclaimers] │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌─ Add New ────────────────────────────────────────────────────┐
│ │ Category:  [Important Info ▼]                                │
│ │ Title:     [________________________________]                │
│ │ Details:   [________________________________]                │
│ │            [________________________________]                │
│ │            [________________________________]                │
│ │                                         [+ Add Knowledge]    │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌─ Your Custom Knowledge (3 items) ────────────────────────────┐
│ │                                                               │
│ │ 📋 Warranty Policy                                           │
│ │    All services come with a 90-day warranty on parts...      │
│ │                                           [Edit] [Delete]    │
│ │                                                               │
│ │ 💡 Family Business                                           │
│ │    We're a family-owned business since 1985, now in our...   │
│ │                                           [Edit] [Delete]    │
│ │                                                               │
│ │ 🎯 Certification                                             │
│ │    We're the only AAA-certified shop in the county...        │
│ │                                           [Edit] [Delete]    │
│ └──────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **No Form Structure Required**
   - Just title + freeform text
   - User decides what to share
   - AI incorporates it naturally

2. **Quick Add Suggestions**
   - One-click templates for common knowledge types
   - Pre-fills title, user adds their specifics
   - Examples: "Warranty Info", "Why Choose Us", "Certifications", etc.

3. **AI Preview**
   - Shows how the knowledge will be used
   - Updates as user adds/edits entries
   - Builds confidence that it's working

4. **Simple Category Selector**
   - "Important Info" (stored as `policy`)
   - "Things to Mention" (stored as `upsell`)
   - Categories are just organizational; AI sees all of it

### Implementation Details

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/components/brain/CustomKnowledgeEditor.tsx` | Main editor component |
| `src/components/brain/SuggestedKnowledgeButtons.tsx` | Quick-add template buttons |

**Files to Modify:**

| File | Change |
|------|--------|
| `src/pages/app/BusinessBrainPage.tsx` | Add CustomKnowledgeEditor to Knowledge tab |
| `src/lib/brain/writeBrainFact.ts` | Add CRUD functions for ai_knowledge_base |

### writeBrainFact.ts Additions

```typescript
// Create custom knowledge entry
export async function createCustomKnowledge(
  tenantId: string,
  entry: {
    type: "policy" | "upsell";
    title: string;
    content: string;
    priority_weight?: number;
  }
)

// Update custom knowledge entry
export async function updateCustomKnowledge(
  id: string,
  tenantId: string,
  updates: {
    title?: string;
    content?: string;
    type?: "policy" | "upsell";
  }
)

// Delete custom knowledge entry
export async function deleteCustomKnowledge(id: string, tenantId: string)
```

### Quick-Add Templates

| Template | Pre-filled Title | Category |
|----------|------------------|----------|
| Years of Experience | "Our Experience" | Important Info |
| Warranty / Guarantee | "Warranty Policy" | Important Info |
| Certifications | "Our Certifications" | Important Info |
| Why Choose Us | "What Makes Us Different" | Things to Mention |
| Special Offers | "Current Promotions" | Things to Mention |
| Service Area Details | "Where We Serve" | Important Info |
| Payment Terms | "Payment Information" | Important Info |
| Disclaimers | "Important Disclaimers" | Important Info |

### Integration with Knowledge Tab

The Knowledge & Training tab will be reorganized:

```
Knowledge & Training Tab:
├── FAQs (existing - BusinessFAQEditor)
├── Handling Customer Concerns (existing - BusinessObjectionEditor)  
├── Custom Knowledge (NEW - CustomKnowledgeEditor) ⭐
├── Uploaded Documents (existing - BrainAssetsManager)
└── Review Queue (existing - BrainReviewQueue)
```

### Constraints Respected

| Constraint | Status |
|------------|--------|
| No new dynamic variables | ✅ Uses existing ai_knowledge_base |
| No edge function changes | ✅ Already reads from table |
| No DB schema changes | ✅ Uses existing table & types |
| No ElevenLabs payload changes | ✅ Same context injection |
| No business logic changes | ✅ Pure UI addition |

### Summary

This gives business owners the **unlimited flexibility** they need to teach their AI anything - from warranty policies to personal stories to seasonal promotions - using infrastructure that's already fully integrated.

The AI will automatically incorporate this knowledge when relevant, saying things like:
- "We're actually the only AAA-certified shop in the county..."
- "Just so you know, all our work comes with a 90-day warranty..."
- "We're a family business - been here since 1985..."

