
# Upload-to-Knowledge Notification System Implementation Plan

## Overview

This plan adds an **Owner Notification System** and enhanced **UX messaging** to ensure business owners always know when uploads are processing, when suggestions are pending, and when conflicts need resolution. The core principle: **"Structured Business Brain (truth layer) ALWAYS overrides uploads until the owner approves merges."**

---

## Current State Analysis

**Existing Infrastructure:**
- `knowledge_gaps` table exists for tracking unanswered AI questions
- `ai_knowledge_base` table stores structured knowledge
- `menu_documents` table stores uploaded documents with parsed content
- No `knowledge_sources`, `extracted_knowledge_suggestions`, or `knowledge_conflicts` tables exist
- No `notifications` table exists
- Dashboard has `UsageThresholdBanner` pattern for alerts
- Copilot has context-aware response generation

**Key Finding:** The upload-to-knowledge extraction pipeline tables don't exist yet. We need to create the complete infrastructure.

---

## Database Schema

### New Tables

**1. `knowledge_sources` - Tracks uploaded documents**
```text
+----------------------+---------------------------+
| Column               | Type                      |
+----------------------+---------------------------+
| id                   | uuid PK                   |
| tenant_id            | uuid FK                   |
| file_name            | text                      |
| file_url             | text nullable             |
| source_type          | enum (menu_pdf, pricing,  |
|                      | services_doc, faq_doc,    |
|                      | general)                  |
| status               | enum (uploading,          |
|                      | processing, ready, failed)|
| processed_at         | timestamptz nullable      |
| error_message        | text nullable             |
| created_at           | timestamptz               |
| updated_at           | timestamptz               |
+----------------------+---------------------------+
```

**2. `extracted_knowledge_suggestions` - AI-extracted items pending review**
```text
+----------------------+---------------------------+
| Column               | Type                      |
+----------------------+---------------------------+
| id                   | uuid PK                   |
| tenant_id            | uuid FK                   |
| source_id            | uuid FK knowledge_sources |
| suggestion_type      | enum (service, faq,       |
|                      | menu_item, policy,        |
|                      | objection)                |
| extracted_data       | jsonb                     |
| status               | enum (pending_review,     |
|                      | approved, rejected,       |
|                      | merged)                   |
| reviewed_at          | timestamptz nullable      |
| reviewed_by          | uuid nullable             |
| created_at           | timestamptz               |
+----------------------+---------------------------+
```

**3. `knowledge_conflicts` - Detected conflicts between uploads and existing data**
```text
+----------------------+---------------------------+
| Column               | Type                      |
+----------------------+---------------------------+
| id                   | uuid PK                   |
| tenant_id            | uuid FK                   |
| source_id            | uuid FK knowledge_sources |
| conflict_type        | enum (price_mismatch,     |
|                      | description_mismatch,     |
|                      | name_mismatch, other)     |
| entity_type          | text (service, menu_item, |
|                      | faq, policy)              |
| existing_entity_id   | uuid nullable             |
| existing_data        | jsonb                     |
| proposed_data        | jsonb                     |
| differing_fields     | text[] (e.g. ["price",    |
|                      | "description"])           |
| status               | enum (unresolved,         |
|                      | keep_existing,            |
|                      | accept_upload,            |
|                      | custom_merged)            |
| resolved_at          | timestamptz nullable      |
| resolved_by          | uuid nullable             |
| created_at           | timestamptz               |
+----------------------+---------------------------+
```

**4. `owner_notifications` - In-app notifications**
```text
+----------------------+---------------------------+
| Column               | Type                      |
+----------------------+---------------------------+
| id                   | uuid PK                   |
| tenant_id            | uuid FK                   |
| type                 | enum (upload_processing,  |
|                      | upload_ready, upload_fail,|
|                      | suggestions_pending,      |
|                      | conflicts_detected,       |
|                      | conflicts_resolved)       |
| title                | text                      |
| message              | text                      |
| severity             | enum (info, warning,      |
|                      | critical) default info    |
| is_read              | boolean default false     |
| action_path          | text nullable (deep link) |
| related_source_id    | uuid nullable             |
| created_at           | timestamptz               |
+----------------------+---------------------------+
```

**5. Database Triggers**
- On `knowledge_sources.status` change to `ready` or `failed`: insert notification
- On insert to `extracted_knowledge_suggestions` with `pending_review`: insert notification
- On insert to `knowledge_conflicts` with `unresolved`: insert notification
- On `knowledge_conflicts` resolution (when unresolved count reaches 0): insert notification

---

## UI Components

### 1. Dashboard Knowledge Status Card (`BusinessBrainStatusCard.tsx`)

**Location:** Displayed on `LiveDashboard` above `DashboardByMode`

**Content:**
- AI Readiness Score (from existing hook)
- Pending Suggestions count (with badge if > 0)
- Unresolved Conflicts count (prominent if > 0)
- "Review Updates" button linking to Business Brain Updates tab

### 2. Conflict Warning Banner (`KnowledgeConflictBanner.tsx`)

**Location:** Top of dashboard when `unresolved_conflicts > 0`

**Content:**
```text
"Action needed: We found conflicts between your uploads and your 
current Business Brain. The AI will keep using your existing 
settings until you review."
[Resolve Conflicts] button
```

### 3. Business Brain Updates Tab

**Location:** New tab in `BusinessBrainPage.tsx`

**Structure:**
- **Explanation Block (top):**
  "Uploads do not automatically change what the AI says. Your Business Brain is the source of truth. If we detect differences, you review and choose what's correct."

- **Sub-tabs:**
  - **Processing** - Active uploads with status indicators
  - **Suggestions** - Pending extracted items to approve/reject
  - **Conflicts** - Items needing resolution (highlight differing fields)

### 4. Conflict Resolution UI (`KnowledgeConflictResolver.tsx`)

**Per conflict:**
- Side-by-side comparison: "Existing (Current Truth)" vs "Proposed (From Upload)"
- Highlighted differing fields
- Actions:
  - "Keep Existing" (AI continues using current data)
  - "Accept Upload" (replaces existing)
  - "Edit & Save" (custom merge)

**After all conflicts resolved:**
- Confirmation message: "Great — your AI knowledge is now updated and consistent."

### 5. Notification Bell & Dropdown (`NotificationBell.tsx`)

**Location:** Top navbar (AppLayout.tsx)

**Features:**
- Bell icon with unread count badge
- Dropdown showing recent notifications
- Click notification to navigate to `action_path`
- "Mark all as read" action

### 6. Onboarding Upload Helper Text

**Location:** Any upload field during onboarding

**Text:**
```text
"Uploads speed up setup. If uploads create conflicts, you'll 
review them before the AI uses them."
```

**Skip message:**
```text
"You can add documents later. Until your Business Brain is 
complete, the AI may ask a few extra questions."
```

---

## Copilot Awareness

### New Query Handler in `generateResponse()`

**Query patterns to handle:**
- "Did the AI learn my menu/pricing sheet?"
- "Did my upload work?"
- "Is my [document] being used?"

**Response logic:**
1. Check `knowledge_sources` for recent uploads
2. If `status = processing`: "Your upload is still being processed..."
3. If `status = ready` with pending suggestions or unresolved conflicts:
   "Your upload was processed, but it needs review before the AI uses it."
   Steps: 
   1. Go to Business Brain → Updates
   2. Approve Suggestions / Resolve Conflicts
4. If all merged and no conflicts:
   "Yes — it's been merged into your Business Brain and the AI will use it."

### Extended Copilot Context

Add to `copilot-context` edge function:
```typescript
knowledge_status: {
  pending_suggestions_count: number;
  unresolved_conflicts_count: number;
  processing_uploads_count: number;
  last_upload_status: string | null;
}
```

---

## Hooks & Data Fetching

### `useKnowledgeUploads.ts`
- Fetch `knowledge_sources` for current tenant
- Real-time subscription for status changes

### `useKnowledgeSuggestions.ts`
- Fetch `extracted_knowledge_suggestions` with `pending_review` status
- Approve/reject mutations

### `useKnowledgeConflicts.ts`
- Fetch `knowledge_conflicts` with `unresolved` status
- Resolve mutations (keep_existing, accept_upload, custom_merge)
- Count unresolved for badges

### `useNotifications.ts`
- Fetch `owner_notifications` ordered by created_at desc
- Mark as read mutations
- Real-time subscription for new notifications

---

## Processing Pipeline (Edge Function Enhancements)

### `process-knowledge-upload/index.ts` (new function)

**Triggered by:** Storage upload webhook or manual invocation

**Flow:**
1. Update `knowledge_sources.status = 'processing'`
2. Insert notification: "Your [file] is being processed..."
3. Parse document (reuse existing parsing logic)
4. Extract structured items (services, FAQs, menu items, etc.)
5. For each extracted item:
   - Check for matching existing entity
   - If match found with differences → create `knowledge_conflict`
   - If no match → create `extracted_knowledge_suggestion`
6. Update `knowledge_sources.status = 'ready'`
7. Insert notification: "Your [file] is ready for review" with action_path

---

## Email Digest (Optional - Nice-to-Have)

### `send-conflict-notification/index.ts` (new function)

**Triggered by:** Database webhook on `knowledge_conflicts` insert

**Conditions:**
- Only if tenant has admin email configured
- Tenant setting `email_conflict_notifications = true` (default off)

**Email Content:**
- Subject: "Action needed: Update your AI knowledge"
- Body: "[Business Name], we found differences between your upload and your current settings. Review them to keep your AI accurate. [Review Now] button"

---

## File Structure

```text
src/
├── hooks/
│   ├── useKnowledgeUploads.ts        (new)
│   ├── useKnowledgeSuggestions.ts    (new)
│   ├── useKnowledgeConflicts.ts      (new)
│   └── useNotifications.ts           (new)
├── components/
│   ├── dashboard/
│   │   ├── BusinessBrainStatusCard.tsx    (new)
│   │   ├── KnowledgeConflictBanner.tsx    (new)
│   │   └── LiveDashboard.tsx              (modify)
│   ├── knowledge/
│   │   ├── KnowledgeUpdatesTab.tsx        (new)
│   │   ├── SuggestionReviewList.tsx       (new)
│   │   ├── KnowledgeConflictResolver.tsx  (new)
│   │   └── ProcessingUploadsCard.tsx      (new)
│   ├── notifications/
│   │   └── NotificationBell.tsx           (new)
│   └── layouts/
│       └── AppLayout.tsx                  (modify - add bell)
├── pages/app/
│   └── BusinessBrainPage.tsx              (modify - add Updates tab)

supabase/
├── functions/
│   ├── process-knowledge-upload/index.ts  (new)
│   └── copilot-context/index.ts           (modify)
├── migrations/
│   └── [timestamp]_knowledge_notifications.sql (new)
```

---

## Technical Details

### RLS Policies

All new tables will have RLS enabled with policies:
- SELECT: `has_tenant_access(auth.uid(), tenant_id)`
- INSERT: Service role only (via triggers/edge functions)
- UPDATE: `has_tenant_access(auth.uid(), tenant_id)` for resolution actions
- DELETE: Not allowed (audit trail)

### Real-time Subscriptions

Enable real-time for:
- `owner_notifications` - for bell badge updates
- `knowledge_sources` - for processing status updates
- `knowledge_conflicts` - for conflict count updates

### Migration Safety

- Tables are additive (no breaking changes)
- Default statuses ensure existing tenants unaffected
- Triggers only fire on new inserts/updates

---

## Acceptance Criteria

1. **Upload a pricing sheet that conflicts with existing service prices:**
   - Conflicts are created in `knowledge_conflicts` table
   - Dashboard banner appears immediately ("Action needed...")
   - Notification created with action link to conflicts page
   - AI continues using existing structured prices until owner resolves

2. **Notification lifecycle works correctly:**
   - Bell shows unread count
   - Clicking notification navigates to correct page
   - Mark as read updates badge

3. **Conflict resolution flow:**
   - "Keep Existing" preserves current data, marks conflict resolved
   - "Accept Upload" updates entity with proposed data
   - "Edit & Save" allows custom merge
   - After all resolved, confirmation message appears

4. **Copilot correctly answers upload status questions:**
   - Processing: "Still processing..."
   - Needs review: "Processed but needs your review..."
   - All merged: "Yes, it's been merged and AI will use it."
