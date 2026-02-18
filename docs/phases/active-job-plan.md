Active Jobs / Work-In-Progress Tracker
What This Feature Does
A new Active Jobs page where business owners can track customer work as it happens — from intake to completion. Each job has a checklist of services being performed, and the owner checks them off as they go. The AI agent automatically knows the current status so when a customer calls asking "how's my car?", the AI gives a real, accurate answer.
Which Businesses Get This
This is NOT auto-enabled for everyone. It's an opt-in capability the owner enables during onboarding or later in settings. It applies to businesses where:
Work takes time and customers might call to check status
Multiple services happen in sequence or parallel
The owner needs to track what's done vs. what's left
Examples by industry:
Industry
Job =
Steps =
Status call example
Auto repair
Vehicle drop-off
Oil change, brake pads, alignment
"How's my car coming along?"
Salon/spa
Multi-service appt
Color processing, cut, blowout
"Is my color done yet?"
HVAC/plumbing
Service call
Diagnose, order parts, install, test
"When will you finish?"
Medical
Treatment plan
Consultation, procedure, follow-up
"What's my next step?"
Renovation/contractor
Project
Demo, framing, electrical, paint
"What stage is my project in?"

Dispatch/towing already has its own tracking via the driver dashboard and fleet system, so this feature complements but does not replace that.
New Capability Flag
Add hasJobTracking to the capabilities system. This gets set during onboarding when the owner answers "yes" to scenarios like:
"Do customers drop off items and pick up later?"
"Do jobs take more than one visit or session?"
Or the owner can enable it later from Settings or Business Brain.

Database Schema
Table: active_jobs
Column
Type
Purpose
id
uuid PK


tenant_id
uuid FK
Tenant isolation
customer_id
uuid FK (nullable)
Link to customers table
location_id
uuid FK (nullable)
Which location
job_number
text
Auto-generated display number (e.g. "JOB-0042")
title
text
Short description ("2019 Honda Civic - Full Service")
status
text
intake, in_progress, on_hold, completed, picked_up, cancelled
priority
text
normal, rush, urgent
notes
text
Internal notes
customer_name
text
Denormalized for quick display
customer_phone
text
E.164 format
metadata_json
jsonb
Industry-specific fields (vehicle info, project details, etc.)
estimated_completion
timestamptz
When owner expects to finish
actual_completion
timestamptz
When all steps were checked off
intake_method
text
manual, ai_call, import, api
source_session_id
uuid FK (nullable)
Link to AI call that created it
notify_on_step_complete
boolean
Owner's preference per job
notify_on_all_complete
boolean
Send "ready for pickup" message
is_active
boolean
Soft delete
created_at
timestamptz


updated_at
timestamptz



Table: job_service_items
Column
Type
Purpose
id
uuid PK


job_id
uuid FK
Parent job
tenant_id
uuid FK
RLS isolation
service_id
uuid FK (nullable)
Link to services catalog (optional)
title
text
Service name (can be custom/free-text)
status
text
pending, in_progress, completed, skipped
sort_order
int
Display order
assigned_to
text
Who's doing this step (optional)
started_at
timestamptz
When work began
completed_at
timestamptz
When checked off
notes
text
Per-step notes
created_at
timestamptz



Table: job_status_updates
Column
Type
Purpose
id
uuid PK


job_id
uuid FK


tenant_id
uuid FK
RLS isolation
previous_status
text
What changed from
new_status
text
What changed to
message
text
Human-readable update
triggered_notification
boolean
Whether a notification was sent
created_by
uuid FK (nullable)
User who made the change
created_at
timestamptz



RLS Policies
All three tables get standard tenant isolation:
SELECT/INSERT/UPDATE: tenant_id matches user's tenant via has_tenant_access()
No cross-tenant data leaks
Realtime
Enable realtime on active_jobs and job_service_items so the dashboard updates live when steps are checked off.

Frontend: Active Jobs Page (/app/jobs)
Page Layout
Header: "Active Jobs" with count badge + "New Job" button
Filter bar:
Status filter: All, In Progress, On Hold, Completed, Picked Up
Search: by customer name, job number, or title
Sort: newest first, oldest first, priority, estimated completion
Job cards/list: Each job shows:
Job number + title
Customer name + phone
Progress bar (3/5 steps complete)
Status badge (color-coded)
Priority indicator (if rush/urgent)
Estimated completion date
Time elapsed since intake
Click into a job -> Job Detail view (slide-over panel):
Header: Job number, title, status dropdown, priority selector
Customer info: Name, phone (click to call), link to CRM profile
Service checklist: Each service item as a checkbox row
Check a box -> marks step complete with timestamp
Unchecking is allowed (undo mistakes)
Each item shows: title, status, assigned-to, time started/completed
"Add Step" button to add more services mid-job
Timeline tab: All status updates chronologically
Notes tab: Free-text internal notes
Notification settings: Per-job toggles for "text after each step" and "text when all done"
Industry-Aware Labels
Industry
"Jobs" becomes
"Steps" becomes
Metadata fields
Auto repair
"Vehicles In Shop"
"Services"
Year/Make/Model, VIN, Mileage
Salon
"Active Clients"
"Treatments"
Hair type, color formula
HVAC/plumbing
"Service Calls"
"Tasks"
Equipment type, location in home
Medical
"Active Cases"
"Procedures"
(HIPAA-gated fields)
General
"Active Jobs"
"Steps"
Custom fields

New Job Dialog
Customer: search existing or create new (with E.164 normalization)
Title: free text
Services: multi-select from service catalog + add custom
Priority: normal/rush/urgent
Estimated completion: date picker
Notes: free text
Notification preferences: checkboxes
Import Option
CSV upload button in the header
Template download link
Maps columns: customer name, phone, services (comma-separated), notes
Preview before import with validation

AI Agent Integration
This is the critical piece. When a customer calls and asks about their job status, the AI needs to know.
Voice Context Variable
Add to voiceContextContract.ts:
active_job_summary
Source: When a caller is identified (by phone number), look up any active jobs for that customer. Build a speech-ready summary like:
"This customer has an active job: 2019 Honda Civic Full Service. 3 of 5 services are complete. Oil change is done, brake pads are done, alignment is done. Tire rotation and fluid flush are still in progress. Estimated completion is tomorrow afternoon."
If no active jobs: empty string (per the "never pass null" rule).
Build Context Update
In buildBusinessContext.ts, after customer lookup, query active_jobs + job_service_items for the caller's phone number. Format into the speech-ready summary.
AI Behavior
The AI agent should:
Proactively mention job status if the caller has an active job ("I see we're working on your Honda Civic right now...")
Answer "when will it be ready?" using estimated_completion
List completed vs. remaining steps when asked for details
If no active job, handle gracefully ("I don't see any active work orders for your number. Would you like to schedule something?")

Owner Notification Preferences
Per the user's answer: it should be up to the owner exactly how notifications work.
Per-Job Settings (on the job detail)
Toggle: "Text customer after each step" (default: off)
Toggle: "Text customer when all complete" (default: on)
Custom message template (optional, falls back to default)
Tenant-Level Defaults (in Settings or Business Brain)
Default notification behavior for new jobs
Message templates:
Step complete: "Hi {customer_name}, update on your {job_title}: {step_name} is now complete. {remaining_count} steps remaining."
All complete: "Hi {customer_name}, your {job_title} is all done! You can pick up anytime during our business hours: {hours_today}."
Channel: SMS (when available), or logged for AI to relay on next call

Sidebar Navigation
Add "Active Jobs" nav item:
Icon: ClipboardCheck from lucide-react
Position: after "Schedule" / "Dispatch"
Only visible when hasJobTracking capability is enabled
Badge shows count of in-progress jobs
Label adapts by industry ("Vehicles In Shop", "Active Clients", etc.)

Capability Opt-In
During Onboarding
Add to the scenario questions (Phase 2 territory):
"Do customers leave items with you for extended work?" (auto repair, tailor, electronics repair)
"Do your jobs have multiple steps that take time?" (contractor, renovation)
If yes -> enable hasJobTracking in capabilities_json.
Post-Onboarding
In Business Brain Hub or Settings, add a toggle:
"Track active jobs and let customers call for updates"
Enabling it adds the capability and shows the Active Jobs nav item

Scope for Lovable vs. Claude Code
Lovable handles (frontend-safe, no conflicts):
New /app/jobs page and all its components
Sidebar nav item (gated by capability)
New hooks: useActiveJobs, useJobServiceItems
Industry-aware labels via existing useIndustryContext
Claude Code handles (backend, schema, edge functions):
Database migration for all 3 tables
RLS policies
Realtime enablement
Voice context variable addition to voiceContextContract.ts
buildBusinessContext.ts update for job status lookup
Notification delivery integration with universal-delivery
Capability flag addition to capability_definitions
Implementation Order:
Schema + RLS (Claude Code)
Capability flag registration (Claude Code)
Frontend page + hooks + nav (Lovable)
AI context integration (Claude Code)
Notification wiring (Claude Code)
Import/CSV feature (Lovable, can be Phase 2)

What's NOT In This Phase
External API sync with shop management software (future — schema supports it via intake_method = 'api')
Push notifications (not built yet platform-wide)
Customer-facing portal view of job progress (future — extend CustomerPortalPage)
Automated step detection from external system
