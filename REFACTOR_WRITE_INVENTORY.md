# REFACTOR WRITE INVENTORY

**Generated:** 2026-02-01
**Purpose:** Complete inventory of all persistence operations to identify what must be moved to Business Brain vs. operational writes that can remain.

---

## CLASSIFICATION LEGEND

- **A) BUSINESS_KNOWLEDGE_WRITE** - Must be moved/locked to Business Brain only
- **B) OPERATIONAL_WRITE** - Leave alone in this pass (bookings, orders, workflow runs, etc.)
- **C) UNKNOWN** - Needs manual inspection to classify

---

## A) BUSINESS_KNOWLEDGE_WRITE (MUST MOVE TO BRAIN)

### 🔴 HOOKS - Business Knowledge Mutations

#### 1. src/hooks/useServices.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 39, 59, 78, 94
**Operations:**
```typescript
LINE 39: .insert({ ...service, tenant_id: tenant.id })
LINE 59: .update(updates)
LINE 78: .delete()
LINE 94: .update({ is_active })
TABLE: services
```
**Reason:** Services are core business knowledge - defines what the business offers.
**Action:** Move to Brain or route through writeBrainFact.ts

---

#### 2. src/hooks/useIntentRules.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 85, 109, 128, 147, 165, 188
**Operations:**
```typescript
LINE 85: .insert({ tenant_id: tenantId, ...rule })
LINE 109: .update({ ...updates, updated_at: ... })
LINE 128: .delete()
LINE 147: .update({ is_enabled: isEnabled, updated_at: ... })
LINE 165: .update({ is_suggested: false, is_enabled: true, updated_at: ... })
LINE 188: .delete()
TABLE: business_intent_rules
```
**Reason:** Intent rules = business logic (required questions, pricing rules, upsell rules, etc.)
**Action:** Move to Brain - this includes Required Questions, Pricing Rules configuration

---

#### 3. src/hooks/useSettings.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 23, 76, 134, 140
**Operations:**
```typescript
LINE 23: .update(updates)
TABLE: tenants

LINE 76: .update(updates)
TABLE: assistant_settings

LINE 134: .delete()
LINE 140: .insert(slots.map((s) => ({ ...s, tenant_id: tenant.id })))
TABLE: availability_slots
```
**Reason:** Tenant profile, AI settings, and business hours are core business knowledge
**Action:** Move to Brain #profile and #scheduling sections

---

#### 4. src/hooks/useKnowledgeUploads.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 76, 99, 118
**Operations:**
```typescript
LINE 76: .insert({ tenant_id: tenant.id, file_name: ..., file_url: ..., source_type: ..., status: "uploading" })
LINE 99: .update({ status: params.status, error_message: params.errorMessage || null, processed_at: ... })
LINE 118: .delete()
TABLE: knowledge_sources
```
**Reason:** Knowledge uploads are business knowledge ingestion
**Action:** Move to Brain #assets section

---

#### 5. src/hooks/useKnowledgeSuggestions.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 53, 65, 73, 85, 93, 105, 128
**Operations:**
```typescript
LINE 53: .insert({ tenant_id: tenant?.id, name: ..., description: ..., duration_minutes: ..., price_amount: ..., is_active: true })
TABLE: services

LINE 65: .insert({ tenant_id: tenant?.id, question: ..., answer: ... })
TABLE: business_faqs

LINE 73: .insert({ tenant_id: tenant?.id, name: ..., description: ..., price_cents: ..., category: ..., dietary_tags: [], is_available: true })
TABLE: menu_items

LINE 85: .insert({ tenant_id: tenant?.id, objection: ..., response: ... })
TABLE: objection_responses

LINE 93: .insert({ tenant_id: tenant?.id, type: "policy", title: ..., content: ... })
TABLE: ai_knowledge_base

LINE 105: .update({ status: "approved", reviewed_at: ... })
LINE 128: .update({ status: "rejected", reviewed_at: ... })
TABLE: extracted_knowledge_suggestions
```
**Reason:** All knowledge suggestion approvals create business knowledge
**Action:** Move to Brain #review-queue section

---

#### 6. src/hooks/useKnowledgeConflicts.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 93, 120, 132, 144, 156, 186, 193, 200, 208
**Operations:**
```typescript
LINE 93: .update({ status: "keep_existing", resolved_at: ... })
TABLE: knowledge_conflicts

LINE 120: .update({ name: ..., description: ..., price_amount: ..., duration_minutes: ... })
TABLE: services

LINE 132: .update({ name: ..., description: ..., price_cents: ..., category: ... })
TABLE: menu_items

LINE 144: .update({ question: ..., answer: ... })
TABLE: business_faqs

LINE 156: .update({ status: "accept_upload", resolved_at: ... })
TABLE: knowledge_conflicts

LINE 186: .update(params.mergedData)
TABLE: services

LINE 193: .update(params.mergedData)
TABLE: menu_items

LINE 200: .update(params.mergedData)
TABLE: business_faqs

LINE 208: .update({ status: "custom_merged", resolved_at: ... })
TABLE: knowledge_conflicts
```
**Reason:** Conflict resolution modifies core business knowledge
**Action:** Move to Brain #review-queue section

---

#### 7. src/hooks/useKnowledgeMergeQueue.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 76, 95, 112, 129, 164, 173, 188, 197, 211, 218, 233, 242
**Operations:**
```typescript
LINE 76: .update({ status: "accepted" })
LINE 95: .update({ status: "rejected" })
LINE 112: .update({ status: "accepted" })
LINE 129: .update({ status: "rejected" })
TABLE: knowledge_merge_queue

LINE 164: .update({ name: ..., description: ..., duration_minutes: ..., price_cents: ... })
LINE 173: .insert({ tenant_id: tenantId, name: ..., description: ..., duration_minutes: ..., price_cents: ..., is_active: true })
TABLE: services

LINE 188: .update({ name: ..., description: ..., price_cents: ..., category_id: ... })
LINE 197: .insert({ tenant_id: tenantId, name: ..., description: ..., price_cents: ..., is_available: true })
TABLE: menu_items

LINE 211: .update({ question: ..., answer: ... })
LINE 218: .insert({ tenant_id: tenantId, question: ..., answer: ... })
TABLE: business_faqs

LINE 233: .update({ name: ..., description: ... })
LINE 242: .insert({ tenant_id: tenantId, name: ..., description: ..., display_order: ... })
TABLE: menu_categories
```
**Reason:** Merge queue operations modify core business knowledge
**Action:** Move to Brain #review-queue section

---

#### 8. src/hooks/useIntelligenceSettings.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 53, 69
**Operations:**
```typescript
LINE 53: .insert({ tenant_id: tenantId, ...defaultSettings })
LINE 69: .upsert({ tenant_id: tenantId, ...updates, updated_at: ... })
TABLE: tenant_intelligence_settings
```
**Reason:** Intelligence settings configure AI behavior (memory, confidence, etc.)
**Action:** Move to Brain #profile or new #ai-settings section

---

#### 9. src/hooks/useDataRetentionSettings.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 85, 101
**Operations:**
```typescript
LINE 85: .insert(newSettings)
LINE 101: .upsert({ tenant_id: tenantId, ...updates, updated_at: ... })
TABLE: data_retention_settings
```
**Reason:** Data retention policies are business configuration
**Action:** Move to Brain #policies section

---

#### 10. src/hooks/useUniversalDelivery.ts
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 74, 93, 147
**Operations:**
```typescript
LINE 74: .insert({ tenant_id: tenant.id })
LINE 93: .update(updates as Record<string, unknown>)
TABLE: universal_delivery_settings

LINE 147: .upsert({ tenant_id: tenant.id, entity_type: entityType, ...updates }, { onConflict: "tenant_id,entity_type" })
TABLE: delivery_rules
```
**Reason:** Delivery rules configure how business entities are routed
**Action:** Move to Brain #policies or #integrations section

---

### 🔴 COMPONENTS - Business Knowledge Direct Writes

#### 11. src/components/dashboard/QuickAddServiceDialog.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 50, 60
**Operations:**
```typescript
LINE 50: supabase.from("menu_items").insert([{
  tenant_id, name, description, price_cents, category, is_available: true
}])

LINE 60: supabase.from("services").insert([{
  tenant_id, name, description, price_amount, duration_minutes, is_active: true
}])
```
**Reason:** Quick-add dialogs bypass Business Brain
**Action:** **REMOVE** or redirect to Business Brain #services

---

#### 12. src/components/dashboard/QuickAddFAQDialog.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 41
**Operations:**
```typescript
LINE 41: supabase.from("business_faqs").insert({
  tenant_id, question, answer
})
```
**Reason:** Quick-add bypasses Business Brain
**Action:** **REMOVE** or redirect to Business Brain #faqs

---

#### 13. src/components/dashboard/QuickAddPolicyDialog.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 78
**Operations:**
```typescript
LINE 78: supabase.from("ai_knowledge_base").insert({
  tenant_id, type: "policy", title, content
})
```
**Reason:** Quick-add bypasses Business Brain
**Action:** **REMOVE** or redirect to Business Brain #policies

---

#### 14. src/components/knowledge/KnowledgeGapQueue.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 154, 162, 170, 181
**Operations:**
```typescript
LINE 154: supabase.from('business_faqs').insert({ tenant_id, question, answer })
LINE 162: supabase.from('objection_responses').insert({ tenant_id, objection, response })
LINE 170: supabase.from('ai_knowledge_base').insert({ tenant_id, type, title, content })
LINE 181: supabase.from('knowledge_gaps').update({ status: "resolved", resolved_at: ... })
```
**Reason:** Knowledge gap queue creates business knowledge
**Action:** Move to Brain #review-queue section

---

#### 15. src/components/setup/QuickSetupWizard.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 66, 161
**Operations:**
```typescript
LINE 66: supabase.from("assistant_settings").upsert({
  tenant_id, business_phone_number: phone
})

LINE 161: supabase.from("assistant_settings").upsert({
  tenant_id, ...aiSettings
})
```
**Reason:** Setup wizard configures business settings
**Action:** Route to Brain or allow only during onboarding (exception case)

---

#### 16. src/components/dashboard/GoLiveStep.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 64, 100
**Operations:**
```typescript
LINE 64: supabase.from("assistant_settings").upsert({
  tenant_id, go_live_enabled: true, setup_completed_at: ...
})

LINE 100: supabase.from("assistant_settings").update({
  ai_enabled: !currentEnabled
})
```
**Reason:** AI activation is business configuration
**Action:** Route to Brain or allow as operational toggle (needs decision)

---

#### 17. src/components/dashboard/ConnectPhoneDialog.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 51
**Operations:**
```typescript
LINE 51: supabase.from("assistant_settings").upsert({
  tenant_id, business_phone_number: phoneNumber
})
```
**Reason:** Phone number is business profile data
**Action:** Route to Brain #profile

---

#### 18. src/components/ai/BookingBehaviorSettings.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 41
**Operations:**
```typescript
LINE 41: supabase.from("assistant_settings").update({
  ai_booking_mode: mode
})
```
**Reason:** Booking behavior is AI configuration
**Action:** Move to Brain #scheduling or #ai-settings

---

#### 19. src/components/settings/BookingDeliverySettings.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 123
**Operations:**
```typescript
LINE 123: supabase.from("booking_delivery_settings").upsert({
  tenant_id, ...settings
})
```
**Reason:** Delivery handoff configuration is business policy
**Action:** Move to Brain #policies or #integrations

---

#### 20. src/components/settings/DispatchDeliverySettings.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 127
**Operations:**
```typescript
LINE 127: supabase.from("dispatch_delivery_settings").upsert({
  tenant_id, ...settings
})
```
**Reason:** Dispatch delivery configuration is business policy
**Action:** Move to Brain #policies or #integrations

---

#### 21. src/components/settings/FoodOrderSettings.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 114
**Operations:**
```typescript
LINE 114: supabase.from("order_delivery_settings").upsert({
  tenant_id, ...settings
})
```
**Reason:** Order delivery configuration is business policy
**Action:** Move to Brain #policies or #integrations

---

#### 22. src/components/settings/MedicalHIPAASettings.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 69
**Operations:**
```typescript
LINE 69: supabase.from("medical_settings").upsert({
  tenant_id, ...settings
})
```
**Reason:** HIPAA settings are business compliance policy
**Action:** Move to Brain #policies

---

#### 23. src/pages/app/SettingsPage.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Lines:** 132-137 (handleSaveBusiness), 146-156 (handleSaveHours)
**Operations:**
```typescript
LINE 132: await updateTenant.mutateAsync({ name: businessName, timezone, phone_public: phone, tagline })
LINE 139: await updateSettings.mutateAsync({ business_phone_number: phone })

LINE 146: await saveSlots.mutateAsync(slotsToSave)
TABLES: tenants, assistant_settings, availability_slots
```
**Reason:** Business profile and hours are core business knowledge
**Action:** Move to Brain #profile and #scheduling

---

#### 24. src/components/settings/RequiredQuestionsEditor.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Uses:** useIntentRules hook (lines 85, 109, 128 in hook)
**Operations:** INSERT/UPDATE/DELETE business_intent_rules
**Reason:** Required questions are business configuration
**Action:** Move to Brain #policies or #ai-settings

---

#### 25. src/components/settings/PricingRulesEditor.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Uses:** Direct tenants.update for pricing_rules_jsonb
**Operations:** UPDATE tenants.pricing_rules_jsonb
**Reason:** Pricing rules are core business knowledge
**Action:** Move to Brain #services or #policies

---

#### 26. src/components/settings/BusynessRulesEditor.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE
**Uses:** Direct tenants.update for busyness_rules_jsonb
**Operations:** UPDATE tenants.busyness_rules_jsonb
**Reason:** Busyness/ETA configuration is business knowledge
**Action:** Move to Brain #scheduling or #services

---

#### 27. src/components/admin/AdminModeSwitcher.tsx
**Classification:** BUSINESS_KNOWLEDGE_WRITE (Admin Tool)
**Lines:** 68-73, 93, 111, 132, 156, 189, 212, 242, 259, 273, 288, 302, 317
**Operations:** Mass DELETE/INSERT for demo data
**Reason:** Admin tool for mode switching - deletes/creates demo business knowledge
**Action:** **SPECIAL CASE** - Admin tool, may exempt OR ensure it routes through Brain write APIs

---

---

## B) OPERATIONAL_WRITE (LEAVE ALONE FOR NOW)

### ✅ HOOKS - Operational Mutations (OK to keep)

#### 28. src/hooks/useBookings.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 77, 97, 116
**Operations:** INSERT/UPDATE/DELETE bookings
**Reason:** Bookings are transactional operational data, not business knowledge
**Action:** **LEAVE ALONE** - operational CRUD

---

#### 29. src/hooks/useLeads.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 39, 59, 78
**Operations:** INSERT/UPDATE/DELETE leads
**Reason:** Leads are operational pipeline data
**Action:** **LEAVE ALONE** - operational CRUD

---

#### 30. src/hooks/useWorkflows.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 77, 104, 127, 143, 165, 208, 239, 257, 286, 306
**Operations:** INSERT/UPDATE/DELETE workflows, workflow_nodes, workflow_edges
**Reason:** Workflows are automation configuration - operational infrastructure
**Action:** **LEAVE ALONE** - workflows are operational automation setup

---

#### 31. src/hooks/useWorkflowRuns.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 235
**Operations:** UPDATE workflow_runs.status (cancel)
**Reason:** Workflow execution state - operational
**Action:** **LEAVE ALONE**

---

#### 32. src/hooks/useIntegrations.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 273, 295, 313, 331, 372, 405, 425, 443
**Operations:** INSERT/UPDATE/DELETE integrations, automation_rules
**Reason:** Integrations and automation rules are operational infrastructure
**Action:** **LEAVE ALONE** - operational integration management

---

#### 33. src/hooks/useConversations.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 105
**Operations:** INSERT messages (outbound)
**Reason:** Messaging is operational communication
**Action:** **LEAVE ALONE**

---

#### 34. src/hooks/useNotifications.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 83, 100
**Operations:** UPDATE owner_notifications.is_read
**Reason:** Notification state - operational
**Action:** **LEAVE ALONE**

---

#### 35. src/hooks/useCalendarConnections.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 142, 173, 190, 263, 290
**Operations:** INSERT/UPDATE/DELETE calendar_connections, busy_blocks
**Reason:** Calendar sync is operational infrastructure
**Action:** **LEAVE ALONE**

---

#### 36. src/hooks/useRoutingRules.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 193, 198
**Operations:** INSERT/UPDATE routing_rules
**Reason:** Routing rules are operational infrastructure (not business knowledge)
**Action:** **LEAVE ALONE**

---

#### 37. src/hooks/useSetupRequests.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 112, 178
**Operations:** INSERT/UPDATE setup_requests
**Reason:** Setup requests are operational support tickets
**Action:** **LEAVE ALONE**

---

#### 38. src/hooks/usePrintQueue.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 70, 102
**Operations:** UPDATE food_orders.handoff_state
**Reason:** Print queue state is operational
**Action:** **LEAVE ALONE**

---

#### 39. src/hooks/useIndustryDemos.ts
**Classification:** OPERATIONAL_WRITE
**Lines:** 69
**Operations:** UPDATE industry_demos
**Reason:** Demo catalog management - operational
**Action:** **LEAVE ALONE**

---

#### 40. src/components/calendar/CreateBookingDialog.tsx
**Classification:** OPERATIONAL_WRITE
**Lines:** 102
**Operations:** INSERT bookings
**Reason:** Manual booking creation - operational
**Action:** **LEAVE ALONE**

---

---

## C) UNKNOWN (NEEDS INSPECTION)

### ❓ Needs Manual Classification

#### 41. src/hooks/useCustomerResolver.ts
**Classification:** UNKNOWN
**Lines:** 84, 127, 136, 161
**Operations:**
```typescript
LINE 84: INSERT opportunities
LINE 127: UPDATE knowledge_gaps
LINE 136: INSERT knowledge_gaps
LINE 161: INSERT sync_events
```
**Question:** Are knowledge_gaps business knowledge or operational tracking?
**Preliminary:** Likely OPERATIONAL - gaps are tracked issues, not core business knowledge
**Suggested:** **OPERATIONAL_WRITE** - leave alone

---

#### 42. src/hooks/useBusinessMemory.ts
**Classification:** UNKNOWN
**Lines:** 79, 98
**Operations:**
```typescript
LINE 79: UPDATE business_memory.is_active
LINE 98: DELETE business_memory
```
**Question:** Is business memory business knowledge or operational data?
**Preliminary:** Could be either - memory entries are learned patterns
**Suggested:** **OPERATIONAL_WRITE** - memory is AI-generated, not owner-authored

---

---

## SUMMARY STATISTICS

### By Classification:
- **A) BUSINESS_KNOWLEDGE_WRITE:** 27 files (MUST MOVE TO BRAIN)
- **B) OPERATIONAL_WRITE:** 14 files (LEAVE ALONE)
- **C) UNKNOWN:** 2 files (NEEDS INSPECTION)

### By File Type:
- **Hooks:** 25 files
- **Components:** 15 files
- **Pages:** 1 file
- **Admin Tools:** 1 file

### Critical Tables (Business Knowledge):
1. `services` - Service/menu catalog
2. `business_faqs` - FAQ knowledge
3. `business_intent_rules` - Required questions, pricing rules
4. `tenants` - Business profile
5. `assistant_settings` - AI configuration
6. `availability_slots` - Business hours
7. `ai_knowledge_base` - Policies, knowledge docs
8. `objection_responses` - Objection handling
9. `menu_items` - Food menu
10. `menu_categories` - Menu organization
11. `knowledge_sources` - File uploads
12. `data_retention_settings` - Retention policies
13. `tenant_intelligence_settings` - AI intelligence config
14. `universal_delivery_settings` - Delivery config
15. `delivery_rules` - Entity routing rules
16. `booking_delivery_settings` - Booking handoff config
17. `dispatch_delivery_settings` - Dispatch handoff config
18. `order_delivery_settings` - Order handoff config
19. `medical_settings` - HIPAA compliance

---

## RECOMMENDED ACTION PLAN

### PHASE 1: Create Business Brain
1. Create `src/pages/app/BusinessBrainPage.tsx` with sections:
   - `#profile` - Business name, contact, hours
   - `#services` - Services/menu catalog + pricing rules
   - `#service-area` - Dispatch zones (future)
   - `#scheduling` - Hours, busyness, availability
   - `#policies` - Cancellation, payment, HIPAA, retention, delivery handoff
   - `#faqs` - Business FAQs
   - `#assets` - Knowledge uploads
   - `#review-queue` - Knowledge conflicts, suggestions, merge queue

### PHASE 2: Lock Down Duplicate Surfaces
**HIGH PRIORITY - Remove/Redirect:**
1. `QuickAddServiceDialog.tsx` → redirect to Brain #services
2. `QuickAddFAQDialog.tsx` → redirect to Brain #faqs
3. `QuickAddPolicyDialog.tsx` → redirect to Brain #policies
4. `RequiredQuestionsEditor.tsx` → move to Brain #policies
5. `PricingRulesEditor.tsx` → move to Brain #services
6. `BusynessRulesEditor.tsx` → move to Brain #scheduling
7. `SettingsPage.tsx` business profile section → redirect to Brain #profile
8. `BookingDeliverySettings.tsx` → move to Brain #policies
9. `DispatchDeliverySettings.tsx` → move to Brain #policies
10. `FoodOrderSettings.tsx` → move to Brain #policies
11. `MedicalHIPAASettings.tsx` → move to Brain #policies

**MEDIUM PRIORITY:**
12. `KnowledgeGapQueue.tsx` → move to Brain #review-queue
13. `BookingBehaviorSettings.tsx` → move to Brain #scheduling
14. Knowledge conflict/merge hooks → route through Brain write APIs

**SPECIAL CASES:**
15. `QuickSetupWizard.tsx` → allow during onboarding only (first-time exception)
16. `GoLiveStep.tsx` → evaluate if AI toggle is operational or config
17. `AdminModeSwitcher.tsx` → admin tool, may exempt

### PHASE 3: Centralize Writes
1. Create `src/lib/brain/writeBrainFact.ts`
2. Create `src/lib/brain/readBrainFacts.ts` (optional)
3. Route all 27 business knowledge write operations through centralized module
4. Only `BusinessBrainPage.tsx` imports writeBrainFact

### PHASE 4: Verification
Run these search patterns to confirm zero writes outside Brain:
```bash
# Should return ONLY BusinessBrainPage.tsx and writeBrainFact.ts
grep -r "\.insert(" src/pages src/components src/lib | grep -v "operational\|bookings\|leads\|workflows"
grep -r "\.update(" src/pages src/components src/lib | grep -v "operational\|bookings\|leads\|workflows"
grep -r "\.upsert(" src/pages src/components src/lib | grep -v "operational\|bookings\|leads\|workflows"
```

Expected: Zero matches outside allowed locations.

---

## NON-NEGOTIABLES CHECKLIST

- [ ] Business Brain is ONLY page with editable forms for business knowledge
- [ ] All Settings pages display read-only + "Edit in Business Brain" CTA
- [ ] Quick-add dialogs either removed or redirect to Brain
- [ ] Zero `.insert/.update/.upsert` calls for business knowledge tables outside Brain
- [ ] Operational writes (bookings, leads, workflows) remain untouched
- [ ] All business knowledge writes route through `writeBrainFact.ts`
- [ ] Verification passes: no prohibited writes found

---

**END OF INVENTORY**
