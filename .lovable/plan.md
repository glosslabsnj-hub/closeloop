
# Make Workflows Fully Functional - End-to-End Implementation

## Problem Summary

The workflow system is **80% built** but has a critical gap: **workflows are never automatically triggered** when business events happen. The `trigger-workflow` edge function exists and is well-implemented, but it's not called when:
- Orders are created/confirmed
- Bookings are created/confirmed  
- Dispatch jobs are created
- Reservations/catering/intakes are created
- Calls end

Currently, workflows can only be triggered manually via:
1. Retry button on failed runs
2. Dry run testing

## Architecture Analysis

```
Current Flow (Broken):
=======================
AI Call → order created → order-handoff (webhooks/email/SMS only) → END
                                          ❌ trigger-workflow NOT called

Required Flow:
==============
AI Call → order created → trigger-workflow → find matching workflow → execute nodes
                                                                ↓
                                        [print_ticket, notify_sms, webhook_push, etc.]
```

## What Needs to Be Done

### 1. Wire Up Automatic Workflow Triggering in Handoff Functions

Add calls to `trigger-workflow` in each handoff edge function when entities are created/confirmed:

**Files to modify:**
- `supabase/functions/order-handoff/index.ts` - trigger on order.created/confirmed
- `supabase/functions/booking-handoff/index.ts` - trigger on booking.created/confirmed
- `supabase/functions/dispatch-handoff/index.ts` - trigger on dispatch.created/confirmed
- `supabase/functions/universal-delivery/index.ts` - trigger for reservations/catering/intakes
- `supabase/functions/elevenlabs-webhook/index.ts` - trigger on call.ended

For each, add after the entity is created/confirmed:
```typescript
// Trigger workflow if any active workflow matches
try {
  await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      trigger: "order.confirmed", // or appropriate trigger
      entity_type: "order",
      entity_id: orderId,
    }),
  });
} catch (e) {
  console.error("Failed to trigger workflow:", e);
}
```

### 2. Add Print Ticket Execution for Food Mode

The `print_ticket` node currently just sets a flag on the order. We need to:
1. Create a **print queue system** that the dashboard can poll
2. Add a **PrintQueueCard** component to the Orders page that shows pending prints
3. Optionally open the print dialog automatically when orders come in

**Implementation:**
- Add `print_queue` table (or use existing `handoff_state.print_requested`)
- Create `usePrintQueue` hook to fetch orders awaiting print
- Add floating print notification/button on OrdersPage
- Connect to `OrderTicketPage` for actual printing

### 3. Enhance Workflow Edit Page with Testing

Add a "Test Workflow" button that:
- Lets user pick a sample entity (recent order, booking, etc.)
- Runs the workflow in dry-run mode
- Shows simulated results

**Add to WorkflowEditPage.tsx:**
- "Test with Sample Data" button
- Entity picker dialog (recent orders/bookings/etc based on trigger type)
- Display dry-run results inline

### 4. Create Pre-built Workflow Templates with Nodes

Currently, templates only set trigger + name. Add actual pre-configured nodes:

```typescript
// Food - Order Confirmed template
{
  trigger: "order.confirmed",
  nodes: [
    { node_type: "print_ticket", config: { format: "thermal", copies: 1 } },
    { node_type: "notify_sms", config: { to: "{{customer_phone}}", message: "Your order #{{order_number}} is confirmed! We'll have it ready for {{requested_time}}." } },
  ]
}
```

### 5. Add Status Banner for Workflow Activity

Show users when workflows are running/completed on the Dashboard:
- Recent workflow activity card
- Success/failure counts
- Link to workflow runs page

## Technical Details

### Changes to Edge Functions

**order-handoff/index.ts (around line 195):**
```typescript
// After successful order handoff, trigger workflow
const eventType = order.status === "confirmed" ? "order.confirmed" : "order.created";
try {
  await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      tenant_id,
      trigger: eventType,
      entity_type: "order",
      entity_id: order_id,
    }),
  });
} catch (e) {
  console.error("Failed to trigger workflow:", e);
}
```

**Similar pattern for:**
- booking-handoff → booking.created / booking.confirmed
- dispatch-handoff → dispatch.created / dispatch.confirmed
- elevenlabs-webhook → call.ended (after call session is saved)

### New Print Queue Component

**src/components/orders/PrintQueueNotification.tsx:**
- Subscribe to orders with `handoff_state.print_requested = true`
- Show toast/floating button when prints are pending
- One-click to open print dialog for each

### Workflow Template Improvements

**WorkflowsPage.tsx - handleCreateFromTemplate:**
```typescript
const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
  // Create workflow
  const workflow = await createWorkflow.mutateAsync({
    name: template.name,
    trigger: template.trigger,
  });
  
  // Add pre-configured nodes
  for (const nodeConfig of template.nodes || []) {
    await addNode.mutateAsync({
      workflow_id: workflow.id,
      ...nodeConfig,
    });
  }
  
  navigate(`/app/workflows/${workflow.id}`);
};
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/order-handoff/index.ts` | Modify | Add trigger-workflow call after handoff |
| `supabase/functions/booking-handoff/index.ts` | Modify | Add trigger-workflow call |
| `supabase/functions/dispatch-handoff/index.ts` | Modify | Add trigger-workflow call |
| `supabase/functions/elevenlabs-webhook/index.ts` | Modify | Add call.ended trigger |
| `supabase/functions/universal-delivery/index.ts` | Modify | Add triggers for reservation/catering/intake |
| `src/components/orders/PrintQueueNotification.tsx` | Create | Floating print notification for pending tickets |
| `src/pages/app/OrdersPage.tsx` | Modify | Add PrintQueueNotification component |
| `src/pages/app/WorkflowsPage.tsx` | Modify | Enhance templates with pre-built nodes |
| `src/pages/app/WorkflowEditPage.tsx` | Modify | Add test workflow button |
| `src/hooks/usePrintQueue.ts` | Create | Hook to monitor print queue |
| `src/components/dashboard/WorkflowActivityCard.tsx` | Create | Show recent workflow runs on dashboard |

## Acceptance Criteria

1. **Food Mode**: When AI takes a phone order and confirms it, a workflow with "Print Ticket" node automatically triggers and marks order for printing
2. **Service Mode**: When a booking is confirmed, workflow triggers and sends confirmation SMS
3. **Dispatch Mode**: When a dispatch job is created, workflow triggers and notifies the team
4. **All Modes**: Workflow runs are logged and visible in the workflow history page
5. **Templates**: Clicking a template creates a ready-to-activate workflow with pre-configured nodes
6. **Testing**: Users can test workflows with dry-run before activating
