# Refactor Step 3: Knowledge Uploads + Auto-Digest + Conflict Review

## Summary

This step integrates the existing knowledge upload and extraction pipeline with Business Brain, providing owners with a centralized view of uploaded assets and a review queue to approve/reject AI-extracted proposals and resolve conflicts. Nothing is written to canonical Brain storage automatically — owners must explicitly approve.

## How Uploads Work

1. **Upload**: Owner uploads a file (PDF, image, DOCX, XLSX) in Business Brain → Assets tab
2. **Storage**: File is stored in Supabase Storage bucket `knowledge-documents`
3. **Record**: A `knowledge_sources` record is created with `status: "uploading"`
4. **Processing**: The `process-knowledge-upload` Edge Function is triggered:
   - Fetches file from storage
   - Sends to AI for extraction (using Lovable AI gateway)
   - Extracts structured data based on source type (menu, services, FAQs, etc.)
   - Compares extracted items to existing Brain knowledge
   - Creates `extracted_knowledge_suggestions` for new items
   - Creates `knowledge_conflicts` for items that differ from existing data
5. **Ready**: Status updates to `ready` and owner sees items in Review Queue

## How Conflicts Are Created

The extraction pipeline compares each extracted item to existing data:

| Scenario | Result |
|----------|--------|
| Item name doesn't exist in DB | Creates a **proposal** (suggestion) |
| Item exists but values differ | Creates a **conflict** with diff |
| Item exists and values match | No action needed |

Conflict detection uses:
- Exact name matching (case-insensitive) for services, menu items
- Fuzzy similarity (>80%) for FAQ questions
- Field-by-field comparison for price, description, duration, etc.

## Database Tables (Already Existing)

| Table | Purpose |
|-------|---------|
| `knowledge_sources` | Tracks uploaded files and their processing status |
| `extracted_knowledge_suggestions` | Stores AI-proposed new items awaiting approval |
| `knowledge_conflicts` | Stores conflicts between uploaded and existing data |

## New/Modified Files

### New Components
- `src/components/brain/BrainAssetsManager.tsx` - Asset upload and management UI with:
  - Upload New tab (uses existing KnowledgeUploadHub)
  - All Assets tab showing file list with status badges
  - Delete confirmation
  - Stats cards (processed, processing, failed counts)

- `src/components/brain/BrainReviewQueue.tsx` - Review queue UI with:
  - Proposals tab: Accept/Reject new items
  - Conflicts tab: Keep Existing / Accept Upload / Edit & Merge
  - Visual diff for conflicting fields
  - `useBrainReviewCount()` hook for badge counts

### Modified Files
- `src/pages/app/BusinessBrainPage.tsx`:
  - Added pending review badge to navigation
  - Replaced placeholder Assets section with BrainAssetsManager
  - Replaced placeholder Review Queue section with BrainReviewQueue

### Existing Infrastructure (Unchanged)
- `src/hooks/useKnowledgeUploads.ts` - CRUD for knowledge_sources
- `src/hooks/useKnowledgeSuggestions.ts` - Proposal approval/rejection
- `src/hooks/useKnowledgeConflicts.ts` - Conflict resolution
- `supabase/functions/process-knowledge-upload/index.ts` - AI extraction pipeline
- `src/components/knowledge/KnowledgeUploadHub.tsx` - File upload UI

## Manual Testing

1. **Upload a document**
   - Go to Business Brain → Knowledge Assets
   - Select a document type (Menu, Services, FAQs, etc.)
   - Upload a PDF or image
   - Verify status shows "Processing" then "Ready"

2. **Review proposals**
   - Go to Business Brain → Review Queue → Proposals tab
   - See extracted items awaiting approval
   - Click "Accept" to add to knowledge base
   - Click "Reject" to dismiss

3. **Resolve conflicts**
   - Upload a document with data that differs from existing records
   - Go to Review Queue → Conflicts tab
   - See side-by-side diff of existing vs uploaded values
   - Choose: Keep Current / Accept Upload / Edit & Merge

4. **Verify badge count**
   - With pending items, the Review Queue nav should show a red badge
   - Badge count = pending proposals + unresolved conflicts

5. **Delete uploaded asset**
   - Go to Knowledge Assets → All Assets tab
   - Click trash icon on an asset
   - Confirm deletion (does not remove already-approved knowledge)

## Architecture Notes

- **No silent overwrites**: The extraction pipeline never writes directly to canonical tables (services, menu_items, business_faqs, etc.). All changes must flow through the Review Queue.
- **Centralized writes**: When approvals happen, they use the existing hook mutations which call Supabase directly. Future enhancement could route through `writeBrainFact.ts` for audit logging.
- **Realtime updates**: Both hooks use Supabase realtime subscriptions for live updates.
- **AI extraction**: Uses Lovable AI gateway with Gemini model. Supports both text documents and images (OCR).

## Storage Bucket

Files are stored in: `knowledge-documents/{tenant_id}/{source_id}/{filename}`

## Edge Function

The `process-knowledge-upload` function handles:
- PDF/DOCX text extraction
- Image OCR via AI vision
- Structured data extraction using function calling
- Comparison with existing data
- Creation of suggestions and conflicts
