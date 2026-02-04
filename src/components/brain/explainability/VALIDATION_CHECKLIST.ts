/**
 * Business Brain Explainability Layer - Validation Checklist
 * 
 * Run through this checklist after any changes to the explainability components.
 * 
 * VALIDATION (Step 8 compliance):
 * ===============================
 * 
 * ✅ API Payload Shapes: NO CHANGES
 *    - No edge functions modified
 *    - No database schema changes
 *    - No changes to dynamic variables computation
 * 
 * ✅ Required Fields: NO NEW FIELDS INTRODUCED
 *    - All fields remain optional
 *    - Guidance is informational only
 *    - Example chips don't auto-save
 * 
 * ✅ UI Elements: READ-ONLY GUIDANCE
 *    - BrainHowItWorks: Collapsible info strip (read-only)
 *    - BrainTabHeader: Tab guidance with tooltips (read-only)
 *    - BrainSetupChecklist: Mirrors readiness, Fix buttons scroll to sections
 *    - BrainPreviewPanel: Sheet showing current values (read-only)
 * 
 * ✅ Deep Links: ALL FUNCTIONAL
 *    - Every readiness issue routes to ?section=X
 *    - Setup checklist items navigate correctly
 *    - Preview panel highlights active section
 * 
 * ✅ Copy Cleanup: PLAIN ENGLISH
 *    - "Service Area Rules" → "Where You Serve"
 *    - "Required Questions" → "What to Collect"
 *    - "Policies & Rules" → "Policies & What to Collect"
 *    - All issue titles use actionable language ("Add your..." not "Missing...")
 * 
 * COMPONENTS CREATED:
 * ===================
 * 1. src/components/brain/explainability/BrainHowItWorks.tsx
 *    - Top info strip with 3 bullets explaining how AI uses this
 *    - Collapsible for non-intrusive UX
 *    - "Preview what AI sees" button
 * 
 * 2. src/components/brain/explainability/BrainTabHeader.tsx
 *    - Standardized header for each tab
 *    - "What this controls" + "How AI uses it" + "Common mistakes"
 *    - Mode-aware guidance via TAB_GUIDANCE constant
 * 
 * 3. src/components/brain/explainability/BrainSetupChecklist.tsx
 *    - Collapsible checklist at top of Business Brain
 *    - Shows P0 (blockers) and P1 (recommended) items
 *    - "Fix" buttons navigate to correct section
 * 
 * 4. src/components/brain/explainability/BrainPreviewPanel.tsx
 *    - Sheet panel showing "What the AI sees"
 *    - Read-only summary of current values
 *    - Status indicators (complete/missing/partial)
 *    - Highlights active section
 * 
 * 5. src/components/brain/explainability/index.ts
 *    - Barrel export for all explainability components
 * 
 * FILES MODIFIED:
 * ===============
 * - src/pages/app/BusinessBrainPage.tsx
 *   - Added explainability imports
 *   - Added preview panel state
 *   - Added BrainHowItWorks strip
 *   - Added BrainSetupChecklist
 *   - Replaced SettingsSection with BrainTabHeader for each tab
 *   - Added detailed inventory comment at top
 * 
 * - src/lib/readiness/issueMapping.ts
 *   - Updated all issue titles to plain English
 *   - Used actionable language ("Add your..." not "Missing...")
 * 
 * - src/hooks/useAIReadinessV2.ts
 *   - Updated formatReadinessFlag() to match plain English labels
 * 
 * MODE-AWARE GUIDANCE:
 * ====================
 * Each tab has mode-specific guidance defined in TAB_GUIDANCE:
 * - service: booking-focused terminology
 * - dispatch: pickup/dropoff, ETA, distance pricing
 * - food: menu, orders, delivery radius
 * - medical: HIPAA, appointments, patient terminology
 * - general: generic booking terminology
 * 
 * TESTING CHECKLIST (5-minute validation per mode):
 * =================================================
 * 
 * For each mode (service, dispatch, food, general):
 * 1. Navigate to /app/business-brain
 * 2. Verify "How This Works" strip appears and collapses
 * 3. Verify Setup Checklist shows relevant issues
 * 4. Click "Fix" on an issue → confirm it scrolls to correct section
 * 5. Click "Preview what AI sees" → confirm panel opens
 * 6. Navigate through all 8 tabs → verify each has correct header
 * 7. Verify mode-specific guidance shows for services tab
 * 8. Confirm no console errors
 * 9. Confirm no dead links
 */
