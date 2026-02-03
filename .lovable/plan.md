
# Smart Document Upload with Auto-Detection & Conflict Resolution

## Summary

You want a **smart upload system** where:
1. User uploads a photo/document (menu, service list, hours sign, anything)
2. AI automatically detects what type of document it is
3. AI extracts structured data (items, prices, descriptions, categories)
4. System compares against existing data and shows conflicts clearly
5. Owner reviews with simple "Keep Mine" / "Accept Upload" / "Edit" options

The good news: **80% of the infrastructure already exists**. We need to enhance it with auto-detection and a better user experience.

---

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Document upload UI | Built | `KnowledgeUploadHub.tsx` |
| File storage (Supabase bucket) | Built | `knowledge-documents` bucket |
| AI extraction edge function | Built | `process-knowledge-upload/index.ts` |
| Image OCR support | Built | Uses Lovable AI vision |
| Conflict detection logic | Built | Compares against existing services/menu items |
| `knowledge_conflicts` table | Built | Stores differing data with side-by-side |
| `extracted_knowledge_suggestions` table | Built | Stores new items awaiting approval |
| Review Queue UI | Built | `BrainReviewQueue.tsx` with Accept/Reject/Merge |

---

## What Needs to Be Built

### 1. Auto-Detection Phase (No Manual Type Selection)

**Current Flow:**
```
User selects "Menu" → Uploads photo → AI extracts menu items
```

**New Flow:**
```
User uploads photo → AI classifies document type → Extracts appropriate data
```

**Changes:**

**A. New Auto-Classify Tool in Edge Function**

Update `process-knowledge-upload/index.ts` to add a classification step before extraction:

```typescript
// Step 1: Classify the document
const classifyTool = {
  type: "function",
  function: {
    name: "classify_document",
    description: "Classify what type of business document this is",
    parameters: {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: ["menu", "services", "pricing", "hours", "policies", "faq", "general"],
          description: "The type of business document"
        },
        confidence: { type: "number", description: "0-1 confidence score" },
        reasoning: { type: "string", description: "Brief explanation" }
      },
      required: ["document_type", "confidence"]
    }
  }
};

// Call AI to classify first
const classifyResponse = await fetch(aiGateway, {
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "You classify business documents. Look for menus, service lists, operating hours, policies, FAQs, or pricing sheets." },
      { role: "user", content: [
        { type: "text", text: "What type of business document is this?" },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]}
    ],
    tools: [classifyTool],
    tool_choice: { type: "function", function: { name: "classify_document" } }
  })
});

const classification = parseToolCall(classifyResponse);
// Now use classification.document_type for extraction
```

**B. Simplified Upload UI**

Update `KnowledgeUploadHub.tsx` to remove the document type dropdown and add an "auto-detect" mode:

```typescript
// Remove manual type selection
// Just show a simple drop zone with smart messaging:

<DropZone>
  <Upload icon />
  <p>Drop your menu, price list, or hours photo here</p>
  <p className="text-xs text-muted-foreground">
    We'll automatically figure out what it is
  </p>
</DropZone>
```

---

### 2. Enhanced Conflict Resolution UI

The current `BrainReviewQueue` works but needs to be more intuitive. Enhance it with:

**A. Visual Side-by-Side Cards**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ PRICE DIFFERENCE                                                    │
│                                                                         │
│  "Classic Burger"                                                       │
│                                                                         │
│  ┌──────────────────────┐    ┌──────────────────────┐                  │
│  │  YOUR CURRENT VALUE  │    │   FROM UPLOAD        │                  │
│  │  ──────────────────  │    │   ──────────────────  │                  │
│  │  $12.99              │    │   $14.99             │                  │
│  │                      │    │                      │                  │
│  │  [KEEP THIS]         │    │  [USE THIS]          │                  │
│  └──────────────────────┘    └──────────────────────┘                  │
│                                                                         │
│  [Edit & Merge] → Opens inline editor to type custom value             │
└─────────────────────────────────────────────────────────────────────────┘
```

**B. Batch Actions**

Add "Accept All New Items" and "Keep All Existing" buttons for bulk operations:

```typescript
<div className="flex gap-2 mb-4">
  <Button onClick={acceptAllProposals}>
    Accept All {pendingCount} New Items
  </Button>
  <Button variant="outline" onClick={rejectAllProposals}>
    Dismiss All
  </Button>
</div>
```

**C. Progress Indicator**

Show how many items were extracted and how many need review:

```
Extracted from "menu-photo.jpg":
├── 12 new items ready to add
├── 3 items with price differences
└── 5 items already matched (no action needed)
```

---

### 3. New Extraction Types

Add support for extracting:

**A. Operating Hours from Photos**

```typescript
// New extraction tool for hours
{
  name: "extract_hours",
  parameters: {
    type: "object",
    properties: {
      hours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string", enum: ["monday", "tuesday", ...] },
            open: { type: "string", description: "HH:MM format" },
            close: { type: "string", description: "HH:MM format" },
            closed: { type: "boolean" }
          }
        }
      }
    }
  }
}
```

**B. Policies from Documents**

Detect and extract cancellation, refund, and deposit policies.

---

## Implementation Plan

### Phase 1: Auto-Detection (Edge Function)

| File | Changes |
|------|---------|
| `supabase/functions/process-knowledge-upload/index.ts` | Add `classifyDocument()` step before extraction |
| | Add new extraction tools for hours and policies |
| | Improve conflict detection to compare more fields |
| | Return classification confidence in response |

### Phase 2: Simplified Upload UI

| File | Changes |
|------|---------|
| `src/components/knowledge/KnowledgeUploadHub.tsx` | Remove document type dropdown |
| | Add "auto-detect" mode as default |
| | Show AI's detected type after processing |
| | Add "Was this wrong? Change type" option |
| `src/components/brain/BrainAssetsManager.tsx` | Update to show detected document type |

### Phase 3: Enhanced Conflict Review

| File | Changes |
|------|---------|
| `src/components/brain/BrainReviewQueue.tsx` | Improve side-by-side diff visualization |
| | Add batch accept/reject all buttons |
| | Add inline editing for custom values |
| | Show extraction summary stats |
| `src/hooks/useKnowledgeSuggestions.ts` | Add `approveAll()` and `rejectAll()` methods |
| `src/hooks/useKnowledgeConflicts.ts` | Add batch resolution methods |

### Phase 4: Hours & Policy Extraction

| File | Changes |
|------|---------|
| `supabase/functions/process-knowledge-upload/index.ts` | Add hours extraction tool |
| | Add policy extraction tool |
| | Create conflicts for hours/policy differences |
| `src/components/brain/BrainReviewQueue.tsx` | Add UI for reviewing hours conflicts |
| | Add UI for reviewing policy conflicts |

---

## Database Tables (Already Exist)

No new tables needed. Uses:

- `knowledge_sources` - Tracks uploaded files
- `extracted_knowledge_suggestions` - Stores AI-proposed new items
- `knowledge_conflicts` - Stores differences with existing data
- `knowledge_merge_queue` - Alternative queue (can consolidate)

---

## User Flow After Implementation

```
1. Owner takes photo of 4-page menu
   ↓
2. Drops all 4 photos into Business Brain → Upload
   ↓
3. System shows: "Processing 4 images..."
   ↓
4. AI classifies each: "Menu detected" ✓ ✓ ✓ ✓
   ↓
5. AI extracts: 47 items found
   ↓
6. System compares to existing 23 menu items
   ↓
7. Results:
   - 15 new items (need approval)
   - 8 price differences (need resolution)
   - 24 items matched perfectly (auto-skipped)
   ↓
8. Owner sees Review Queue with:
   - "Proposals" tab: 15 new items to accept/reject
   - "Conflicts" tab: 8 price differences to resolve
   ↓
9. Owner clicks "Accept All New Items"
   ↓
10. Owner reviews 8 conflicts one by one:
    - "Burger was $12.99, photo shows $14.99" → [Keep Current] [Accept Upload] [Edit]
   ↓
11. Done! Menu fully synced.
```

---

## Technical Details

### Auto-Classification Prompt

```typescript
const classifySystemPrompt = `You are a business document classifier. 
Analyze the image and determine what type of business document it is.

Categories:
- "menu" - Restaurant/food menus with dishes and prices
- "services" - Service catalogs for salons, contractors, etc.
- "pricing" - General price lists
- "hours" - Operating hours signs or schedules
- "policies" - Cancellation, refund, deposit policies
- "faq" - FAQ documents or info sheets
- "general" - Other business documents

Be confident in your classification. Look for visual cues like:
- Menu: Food items, categories like Appetizers/Entrees, $X.XX prices
- Services: Duration times, service names like "Haircut", "Plumbing Repair"
- Hours: Days of week, open/close times
`;
```

### Confidence Handling

```typescript
if (classification.confidence < 0.7) {
  // Low confidence - ask user to confirm
  return { needsConfirmation: true, suggestedType: classification.document_type };
}
// High confidence - proceed automatically
```

---

## What You Need To Do

1. **Nothing special** - this is all buildable with existing infrastructure
2. Ensure the Lovable AI gateway is working (already is via `LOVABLE_API_KEY`)
3. Ensure storage bucket `knowledge-documents` is accessible (already is)

---

## Expected Outcome

After implementation:

1. **Zero-friction uploads** - Just drop a photo, no type selection needed
2. **Smart extraction** - AI figures out what the document is
3. **Clear conflict resolution** - Side-by-side comparison with one-click choices
4. **Batch operations** - Handle 50 items from a menu photo efficiently
5. **Extensible** - Same pattern works for hours, policies, FAQs

This turns a 4-page menu into structured data in under 2 minutes with minimal owner effort.
