
# Knowledge Upload System Enhancement Plan

## Overview

This plan implements three major enhancements:
1. **Process Knowledge Upload Edge Function** - Automatically parse documents, extract knowledge items, detect conflicts, and create notifications
2. **Switch Button Visibility Fix** - Make toggle switches visible when OFF (currently white-on-white)
3. **Central Upload Hub in Business Brain** - Allow all businesses to upload documents (menus, services, FAQs, policies) with intelligent conflict detection

---

## Part 1: Switch Button Visibility Fix

### Problem
The Switch component uses `bg-input` when unchecked, which maps to a light gray color (`220 13% 91%` in light mode). On white backgrounds, this creates poor contrast and makes OFF switches nearly invisible.

### Solution
Update the global Switch component to use a more visible background when unchecked.

### File Changes

**`src/components/ui/switch.tsx`**
- Change `data-[state=unchecked]:bg-input` to `data-[state=unchecked]:bg-muted-foreground/20`
- This provides a visible gray background while maintaining the design system
- Works in both light and dark modes

---

## Part 2: Central Upload Hub in Business Brain

### New UI Components

**1. Upload Hub Card (`src/components/knowledge/KnowledgeUploadHub.tsx`)**

A central upload interface with:
- Drag-and-drop zone
- Document type selector dropdown (Menu, Services, FAQ, Policy, General)
- File type indicators (PDF, Image, Word, Excel)
- Upload progress indicator
- Helper text explaining what each document type should contain

**Content for document type descriptions:**
- **Menu**: "Price list, menu PDF, or photos of your menu boards"
- **Services & Pricing**: "Service catalogs, pricing sheets, or rate cards"
- **FAQs**: "Frequently asked questions document or knowledge base export"
- **Policies**: "Cancellation policy, refund policy, terms of service"
- **General**: "Any other business information for your AI"

**2. Integration with Business Brain Page**

Add the Upload Hub to the Business Brain Overview tab:
- Position: After the "Knowledge Completion" card and before "What Your AI Knows"
- Card with title "Upload Documents" and description "Speed up AI setup by uploading existing business documents"
- Links to the Updates tab for processing status

**3. Upload State Indicators**

- Processing spinner with file name
- Success checkmark with "Ready for review" link
- Error state with retry option

### Storage Bucket

Create a new storage bucket for knowledge documents:
- Bucket name: `knowledge-documents`
- Public: No (authenticated access only)
- RLS policies for tenant isolation

---

## Part 3: Process Knowledge Upload Edge Function

### Function: `supabase/functions/process-knowledge-upload/index.ts`

**Triggered by:** Direct invocation after file upload completes

**Input:**
```typescript
{
  sourceId: string;      // knowledge_sources.id
  tenantId: string;      // For context
  fileUrl: string;       // Storage URL
  sourceType: string;    // menu_pdf, services_doc, etc.
}
```

**Processing Flow:**

```text
1. Fetch document from storage
         |
         v
2. Determine parsing strategy based on file type
   - PDF: Extract text via Lovable AI
   - Images (PNG/JPG): OCR via Lovable AI vision
   - DOCX/XLSX: Convert to text format
         |
         v
3. Send to Lovable AI with extraction prompt
   - Model: google/gemini-2.5-flash (fast, cost-effective)
   - Structured output via tool calling
         |
         v
4. For each extracted item:
   a. Check if matching entity exists
   b. If match found:
      - Compare fields
      - If different → create knowledge_conflict
   c. If no match:
      - Create extracted_knowledge_suggestion
         |
         v
5. Update knowledge_sources.status to 'ready' or 'failed'
         |
         v
6. Database triggers create owner_notifications automatically
```

**AI Extraction Prompt Strategy:**

Use tool calling with structured schemas for each document type:

```typescript
// Menu extraction tool
{
  name: "extract_menu_items",
  parameters: {
    items: [{
      name: string,
      description: string,
      price_cents: number,
      category: string
    }]
  }
}

// Services extraction tool
{
  name: "extract_services",
  parameters: {
    services: [{
      name: string,
      description: string,
      price_amount: number,
      price_type: "fixed" | "starting_at" | "quote_only",
      duration_minutes: number
    }]
  }
}

// FAQ extraction tool
{
  name: "extract_faqs",
  parameters: {
    faqs: [{
      question: string,
      answer: string
    }]
  }
}

// Policy extraction tool
{
  name: "extract_policies",
  parameters: {
    cancellation: string | null,
    refund: string | null,
    deposit: string | null,
    general: string | null
  }
}
```

**Conflict Detection Logic:**

For each extracted item:
1. Query existing entities by normalized name match (case-insensitive, trimmed)
2. If match found, compare key fields:
   - Menu items: price_cents, description, category
   - Services: price_amount, duration_minutes, description
   - FAQs: answer (fuzzy match threshold: 80% similarity)
3. If any field differs significantly, create a conflict record with:
   - `existing_data`: Current values from database
   - `proposed_data`: Extracted values from document
   - `differing_fields`: Array of field names that differ

**Error Handling:**
- Parse failures: Set status to 'failed' with descriptive error_message
- Partial extraction: Create suggestions for valid items, log warnings for skipped
- API rate limits: Retry with exponential backoff (max 3 attempts)

---

## Part 4: Conflict Warning UX

### Persistent Banner

**File: `src/components/dashboard/KnowledgeConflictBanner.tsx`** (already exists)

Current implementation is correct. Ensure it's visible in:
- LiveDashboard (already added)
- BusinessBrainPage Overview tab (add if missing)

### Badge Integration

**Files to update:**
- `src/components/layouts/AppLayout.tsx` - Add badge to "Business Brain" sidebar item
- Already have badge in tabs for Updates

### Toast Notifications

When upload processing completes, show toast:
- Success: "Upload processed! Review suggestions to update your AI."
- Conflict: "Upload found differences with your current settings. Review conflicts."
- Failure: "Upload processing failed. Please try again."

---

## Database Changes

### Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', false);

-- RLS: Users can upload to their tenant folder
CREATE POLICY "Tenant users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-documents' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM tenants 
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
);

-- RLS: Users can view their tenant's documents
CREATE POLICY "Tenant users can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid()
  )
);
```

---

## File Structure

```text
New Files:
├── src/components/knowledge/KnowledgeUploadHub.tsx
├── supabase/functions/process-knowledge-upload/index.ts

Modified Files:
├── src/components/ui/switch.tsx (visibility fix)
├── src/pages/app/BusinessBrainPage.tsx (add Upload Hub)
├── src/components/layouts/AppLayout.tsx (add badge to Business Brain nav)
```

---

## Technical Implementation Details

### Upload Flow (Frontend)

```typescript
// 1. User selects file and document type
// 2. Create knowledge_sources record (status: 'uploading')
// 3. Upload file to storage: knowledge-documents/{tenantId}/{sourceId}/{filename}
// 4. Update knowledge_sources with file_url
// 5. Call process-knowledge-upload edge function
// 6. Edge function updates status → triggers create notifications
// 7. Frontend receives real-time update via subscription
// 8. Show toast notification
```

### Edge Function CORS Headers

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### Lovable AI Integration

- Uses `LOVABLE_API_KEY` (already configured as secret)
- Model: `google/gemini-2.5-flash` for fast extraction
- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Use tool calling for structured output

---

## Acceptance Criteria

1. **Switch Visibility**
   - All toggle switches visible when OFF on white backgrounds
   - Maintains visual distinction between ON (primary color) and OFF states
   - Works in both light and dark modes

2. **Upload Hub**
   - Drag-and-drop file upload works
   - Document type selector shows appropriate types
   - Supported formats: PDF, PNG, JPG, DOCX, XLSX
   - Upload progress visible
   - Success/failure states clear

3. **Document Processing**
   - Menu PDFs extract item names, prices, descriptions
   - Service documents extract service details
   - FAQ documents extract Q&A pairs
   - Policies are identified and extracted
   - Processing takes < 30 seconds for typical documents

4. **Conflict Detection**
   - When extracted item matches existing entity with different values, conflict is created
   - Conflict clearly shows "Existing" vs "Proposed" values
   - Differing fields are highlighted
   - Resolution options: Keep Existing, Accept Upload, Edit & Save

5. **Notifications**
   - Upload start: "Processing your upload" notification
   - Upload complete: "Ready for review" notification
   - Conflicts detected: "Action needed" notification with critical severity
   - All conflicts resolved: "All resolved" confirmation

6. **User Experience**
   - No automatic changes to AI knowledge without owner review
   - Clear messaging: "Your Business Brain is the source of truth"
   - Progress visible at every step
   - Helpful error messages on failure
