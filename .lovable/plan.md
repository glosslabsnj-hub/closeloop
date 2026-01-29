
# Frictionless Workflow Automation - Make It Easy for Every Business Owner

## Summary

Based on your preferences, I'll implement a **dual-mode workflow system** that automatically works out of the box with smart defaults, while offering an advanced visual editor for power users. The system will auto-create industry-specific workflows during onboarding, provide a simple toggle-based interface by default, and ensure all priority actions (customer notifications, kitchen/team alerts, external integrations) work seamlessly from day one.

## The Problem Today

Currently, business owners have to:
1. Navigate to Workflows page
2. Figure out which template to use
3. Create a workflow manually
4. Configure each node individually
5. Activate the workflow

This is too many steps. Most owners won't complete this, meaning their automations never run.

## The Solution: Zero-Setup Automation

### Design Philosophy
- **Works instantly**: Smart defaults enabled on signup - no workflow configuration needed
- **Simple by default**: Toggle switches to turn automations on/off
- **Advanced when needed**: "Advanced" button reveals the full visual editor
- **Industry-aware**: Auto-creates the right workflows for each business mode

## Implementation Plan

### 1. Auto-Create Workflows During Onboarding

When a business completes onboarding, automatically create and activate the essential workflows for their business mode. No action required from the owner.

**Food Mode → Auto-creates:**
- "Order Confirmed" workflow (print ticket + SMS customer)
- "Order Ready" workflow (SMS customer when ready)

**Service Mode → Auto-creates:**
- "Booking Confirmed" workflow (SMS confirmation)
- "Call Wrap-Up" workflow (push to CRM - webhook placeholder)

**Dispatch Mode → Auto-creates:**
- "Dispatch Created" workflow (SMS customer + notify team)
- "Job Completed" workflow (request feedback)

**Medical Mode → Auto-creates:**
- "Intake Created" workflow (notify front desk)
- "Appointment Confirmed" workflow (SMS with instructions)

**All Modes → Auto-creates:**
- "Missed Call Follow-up" workflow (auto-text callback)

**File to modify:** `src/pages/app/OnboardingPage.tsx`
- After tenant creation, call a new function to create default workflows

**File to create:** `src/lib/createDefaultWorkflows.ts`
- Exports `createDefaultWorkflowsForMode(tenantId, businessMode)` function
- Uses the same template data from `WorkflowsPage.tsx`
- Creates workflows with `status: "active"` and `is_default: true`

### 2. Simple Mode: Toggle-Based Automation Page

Create a new simple automation interface that non-technical owners can use immediately.

**New Component:** `src/components/workflows/SimpleAutomationPanel.tsx`

This shows a clean list of automation types with ON/OFF toggles:

```
┌─────────────────────────────────────────────────────────────┐
│ 📱 Customer Notifications                                   │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ✉️ Text when order/booking is confirmed     [ON] ───────   │
│    "Hi {name}! Your order is confirmed..."                  │
│    [Edit message]                                           │
│                                                             │
│ ✉️ Text when order is ready                 [ON] ───────   │
│    "Great news! Your order is ready..."                     │
│    [Edit message]                                           │
│                                                             │
│ ✉️ Text on missed call                      [ON] ───────   │
│    "Sorry we missed your call..."                           │
│    [Edit message]                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 🖨️ Kitchen / Team Alerts                                   │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 🖨️ Print ticket when order confirmed       [ON] ───────   │
│    Format: Thermal (receipt) · 1 copy                       │
│    [Configure]                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 🔗 External Integrations                                    │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 🔗 Push call summaries to CRM               [OFF] ──────   │
│    No webhook URL configured                                │
│    [Set up webhook] or [Connect Zapier]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│                                                             │
│         [Show Advanced Workflow Editor →]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Each toggle maps to a specific workflow trigger + node type
- Toggling ON: Creates/activates the workflow if it doesn't exist
- Toggling OFF: Pauses the workflow (doesn't delete)
- "Edit message" opens an inline text editor for the SMS template
- "Configure" opens a simple config form (e.g., print format)
- "Set up webhook" / "Connect Zapier" opens config with Zapier-friendly instructions
- Mode-aware: Only shows relevant automations for the business type

### 3. Seamless Mode Switching

**Updated WorkflowsPage.tsx:**
- Add "Simple" vs "Advanced" view toggle at top
- Default to "Simple" view
- "Advanced" shows the current visual workflow list

**Simple view:**
- Shows the `SimpleAutomationPanel` component
- Clean, toggle-based interface
- No workflow jargon - uses business language

**Advanced view:**
- Shows current workflow list with create/edit/delete
- Visual node editor
- For power users who want conditional logic, delays, etc.

### 4. Quick Message Editor Component

**New Component:** `src/components/workflows/QuickMessageEditor.tsx`

A lightweight inline editor for SMS templates:
- Shows current message preview
- Click to edit in a modal
- Variable picker dropdown ({{customer_name}}, {{order_number}}, etc.)
- Character counter for SMS limits
- "Save" updates the workflow node config directly

### 5. One-Click Webhook/Zapier Setup

**New Component:** `src/components/workflows/WebhookSetup.tsx`

For external integrations:
- Input field for webhook URL
- "Test webhook" button to send sample data
- Zapier-specific instructions with screenshots
- Pre-formatted example payload they can copy

### 6. Dashboard Integration

**Add to Dashboard:**
- Show automation status card with quick toggles
- "Automations: 3 active" with link to configure
- Alert if critical automation is OFF (e.g., no confirmation texts)

**Update:** `src/components/dashboard/DashboardByMode.tsx`
- Add `AutomationStatusCard` component
- Shows active automation count by category
- Quick link to Simple Automation Panel

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/createDefaultWorkflows.ts` | Auto-create workflows on signup |
| `src/components/workflows/SimpleAutomationPanel.tsx` | Toggle-based automation UI |
| `src/components/workflows/QuickMessageEditor.tsx` | Inline SMS template editor |
| `src/components/workflows/WebhookSetup.tsx` | Easy webhook/Zapier config |
| `src/components/dashboard/AutomationStatusCard.tsx` | Dashboard automation overview |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/app/OnboardingPage.tsx` | Call `createDefaultWorkflows` after tenant creation |
| `src/pages/app/WorkflowsPage.tsx` | Add Simple/Advanced view toggle, default to Simple |
| `src/hooks/useWorkflows.ts` | Add `toggleWorkflow` mutation for easy on/off |
| `src/components/dashboard/DashboardByMode.tsx` | Add AutomationStatusCard |

## User Experience Flow

### New Business Owner (10-minute setup target)

1. **Complete onboarding** → Workflows auto-created and active
2. **Dashboard shows**: "✅ Automations active: Order confirmations, Print tickets, Missed call texts"
3. **First order comes in** → Ticket prints, SMS sent automatically
4. **Owner happy** → Didn't have to configure anything

### Owner Wants to Customize

1. Click "Automations" in sidebar or dashboard card
2. See simple toggle list of what's on/off
3. Toggle OFF "Print tickets" if they don't need it
4. Click "Edit message" to customize confirmation text
5. Done in 30 seconds

### Power User Wants Complex Logic

1. Go to Automations page
2. Click "Show Advanced Workflow Editor"
3. Full visual editor with nodes, conditions, delays
4. Create custom workflows with branching logic

## Acceptance Criteria

1. **Zero-setup**: A new food business can receive phone orders and have tickets print + SMS send without touching workflow settings
2. **Simple mode**: Non-technical owners can toggle automations on/off and edit messages without understanding "workflows"
3. **Advanced mode**: Power users still have access to the full visual workflow editor
4. **All priority actions work**: Customer notifications, kitchen/team alerts, and external integrations all function from day one
5. **Industry-aware**: Different business modes see only relevant automation options

## Technical Notes

### Workflow Activation Logic
When a toggle is turned ON:
1. Check if workflow exists for this trigger type
2. If exists and paused → set status to "active"
3. If doesn't exist → create new workflow with default nodes
4. If exists and already active → no-op

When a toggle is turned OFF:
1. Find workflow for this trigger type
2. Set status to "paused"
3. Workflow remains in DB for easy re-enable

### Default Workflow Templates
Reuse the `WORKFLOW_TEMPLATES` from `WorkflowsPage.tsx` to ensure consistency between auto-creation and manual template selection.

### Backwards Compatibility
- Existing workflows created manually are preserved
- Simple mode shows their status correctly
- Advanced mode still fully editable
