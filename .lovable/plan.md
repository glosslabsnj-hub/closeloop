

# Comprehensive Workflow Help & Setup Guide System

## Summary

This plan creates an industry-aware, step-by-step workflow help system that makes setting up automations easy for every business owner. The system will include:

1. **Enhanced Automations Help Guide** - Completely rewritten with step-by-step instructions for each industry
2. **Variable Reference Guide** - Business-friendly explanations of all available variables with examples
3. **In-Context Help Tabs** - Help accessible directly from the Workflows/SimpleAutomationPanel page
4. **Interactive Setup Wizards** - Guided flows for connecting webhooks, Zapier, and testing automations

## Current State

- `HelpGuideAutomations.tsx` exists but is generic - lacks step-by-step setup instructions
- Variables are shown in `VariablePicker` but without explanations of what they mean
- No inline help on the `SimpleAutomationPanel` or `WorkflowsPage`
- Webhook/Zapier setup requires technical knowledge

## Solution Architecture

### 1. Create Comprehensive Workflow Help Guide Component

**New Component:** `src/components/help/HelpGuideWorkflows.tsx`

This replaces/enhances `HelpGuideAutomations.tsx` with:

- **Industry-specific setup guides** - Separate accordion sections for each business mode
- **Step-by-step walkthroughs** - Numbered steps with screenshots/illustrations
- **Real examples** - Actual message templates businesses can copy
- **Variable dictionary** - Plain-English explanations of each variable
- **Troubleshooting section** - Common issues and fixes

Structure:
```
- Getting Started with Automations
- How Automations Work (simple trigger → action diagram)
- Setting Up Your First Automation
  - Service Business: Booking Confirmations
  - Food Business: Order Confirmations + Kitchen Tickets
  - Dispatch Business: Job Notifications
  - Medical Practice: Appointment Confirmations
- Understanding Variables (with examples)
  - Customer Information Variables
  - Order/Booking Details Variables
  - Business Information Variables
- Connecting External Tools
  - Setting Up Webhooks
  - Connecting to Zapier
  - Common Integrations
- Testing Your Automations
- Troubleshooting
```

### 2. Create Variable Reference Component

**New Component:** `src/components/workflows/VariableGuide.tsx`

A visual, business-friendly variable reference that:
- Groups variables by category (Customer, Order, Business, etc.)
- Shows what each variable displays (with example values)
- Allows one-click copy to clipboard
- Accessible from message editor and help center

Example format:
```
Customer Information
--------------------
{{customer_name}}     → "John Smith"         The customer's full name
{{customer_phone}}    → "(555) 123-4567"     Customer's phone number
{{customer_email}}    → "john@example.com"   Customer's email address

Order Details
-------------
{{order_number}}      → "#1234"              The order reference number
{{items_summary}}     → "2x Pizza, 1x Salad" List of items ordered
{{total_formatted}}   → "$45.99"             Total amount with currency
```

### 3. Add Help Tab to Workflows Page

**Modify:** `src/pages/app/WorkflowsPage.tsx`

Add a "Help" tab alongside Simple/Advanced modes that shows:
- Quick start guide for their business mode
- Links to full documentation
- Video tutorials (placeholder for future)
- Contact support option

### 4. Enhance SimpleAutomationPanel with Inline Help

**Modify:** `src/components/workflows/SimpleAutomationPanel.tsx`

Add:
- Help icon next to each automation toggle with tooltip explaining what it does
- "How does this work?" expandable section for each category
- Link to full guide at bottom of each section

### 5. Create Industry-Specific Setup Guides

**New File:** `src/data/workflowGuides.ts`

Centralized data file containing:
- Step-by-step setup instructions per business mode
- Default message templates with explanations
- Variable mappings with business-friendly descriptions
- Common use cases and examples

### 6. Enhance QuickMessageEditor with Variable Descriptions

**Modify:** `src/components/workflows/QuickMessageEditor.tsx`

Improve the variable section to show:
- Description of what each variable contains
- Example output for each variable
- Categorized grouping (Customer, Order, Business)
- "Preview" showing what the final message might look like

### 7. Enhanced WebhookSetup with Guided Flow

**Modify:** `src/components/workflows/WebhookSetup.tsx`

Add:
- Zapier-specific integration guide with step-by-step
- Copy-paste payload examples
- Test webhook functionality
- Common integration templates (Slack, Google Sheets, etc.)

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/help/HelpGuideWorkflows.tsx` | Comprehensive workflow documentation component |
| `src/components/workflows/VariableGuide.tsx` | Visual variable reference with examples |
| `src/data/workflowGuides.ts` | Centralized guide content and templates |
| `src/components/workflows/InlineHelpTooltip.tsx` | Reusable help tooltip for automation toggles |
| `src/components/workflows/IntegrationGuide.tsx` | Step-by-step external integration help |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/app/HelpCenterPage.tsx` | Add workflows category, update to use new guide |
| `src/components/help/HelpGuideAutomations.tsx` | Complete rewrite with industry-specific guides |
| `src/components/workflows/SimpleAutomationPanel.tsx` | Add inline help icons and expandable guides |
| `src/components/workflows/QuickMessageEditor.tsx` | Enhanced variable picker with descriptions |
| `src/components/workflows/WebhookSetup.tsx` | Add Zapier guide and test functionality |
| `src/pages/app/WorkflowsPage.tsx` | Add Help tab option |
| `src/types/workflow.ts` | Add variable descriptions to TEMPLATE_VARIABLES |

## Detailed Component Designs

### HelpGuideWorkflows.tsx Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚀 How Automations Work                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📞 Something Happens  →  ⚡ Automation Runs  →  📱 Action Sent │
│  (Order placed)           (Your workflow)        (SMS sent)     │
│                                                                 │
│  Automations run automatically when business events happen.    │
│  You set them up once, and they work 24/7.                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📋 Setup Guide for [Your Business Type]                        │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Step 1: Enable Customer Notifications                        │
│ ▼ Step 2: Customize Your Messages                               │
│ ▼ Step 3: Set Up Kitchen/Team Alerts (if applicable)           │
│ ▼ Step 4: Connect External Tools (optional)                    │
│ ▼ Step 5: Test Your Automations                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📝 Message Variables                                            │
├─────────────────────────────────────────────────────────────────┤
│ Use these placeholders to personalize your messages:           │
│                                                                 │
│ Customer Info:                                                  │
│ ┌──────────────────┬────────────────────────────────────────┐  │
│ │ {{customer_name}}│ Customer's name → "Sarah Johnson"     │  │
│ │ {{customer_phone}}│ Phone number → "(555) 123-4567"      │  │
│ └──────────────────┴────────────────────────────────────────┘  │
│                                                                 │
│ Order/Booking Info:                                             │
│ ┌──────────────────┬────────────────────────────────────────┐  │
│ │ {{order_number}} │ Order ID → "#1234"                     │  │
│ │ {{service_name}} │ Service booked → "Haircut & Style"     │  │
│ └──────────────────┴────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### VariableGuide.tsx Design

```
┌─────────────────────────────────────────────────────────────────┐
│ Variable Reference                                    [Search 🔍]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 👤 Customer Information                                         │
│ ─────────────────────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ {{customer_name}}                               [Copy]      ││
│ │ The customer's full name                                    ││
│ │ Example: "Sarah Johnson"                                    ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ {{customer_phone}}                              [Copy]      ││
│ │ Customer's phone number                                     ││
│ │ Example: "(555) 123-4567"                                   ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ 🛒 Order Details (Food Mode)                                    │
│ ─────────────────────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ {{order_number}}                                [Copy]      ││
│ │ The order reference number                                  ││
│ │ Example: "#1234"                                            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### workflowGuides.ts Data Structure

```typescript
export const VARIABLE_DESCRIPTIONS = {
  customer_name: {
    label: "Customer Name",
    description: "The customer's full name",
    example: "Sarah Johnson",
    category: "customer",
  },
  customer_phone: {
    label: "Customer Phone",
    description: "Customer's phone number in formatted form",
    example: "(555) 123-4567",
    category: "customer",
  },
  order_number: {
    label: "Order Number",
    description: "The unique order reference number",
    example: "#1234",
    category: "order",
    modes: ["food"],
  },
  // ... all variables with descriptions
};

export const INDUSTRY_GUIDES = {
  food: {
    title: "Restaurant & Food Service",
    automations: [
      {
        id: "order-confirmed",
        title: "Order Confirmation Text",
        description: "Let customers know their order was received",
        steps: [
          "Toggle ON 'Text when order is confirmed'",
          "Click 'Edit message' to customize",
          "Use {{customer_name}} to personalize",
          "Include {{order_number}} so they can reference it",
        ],
        defaultMessage: "Hi {{customer_name}}! Your order #{{order_number}} is confirmed. We'll have it ready shortly!",
        variables: ["customer_name", "customer_phone", "order_number", "items_summary", "total_formatted"],
      },
      // ... more automations
    ],
  },
  service: { /* ... */ },
  dispatch: { /* ... */ },
  medical: { /* ... */ },
};
```

## User Experience Flow

### Business Owner Setting Up Automations

1. Owner goes to Workflows page → sees Simple Mode with toggles
2. Hovers over help icon → sees quick explanation
3. Clicks "Need help?" link → opens help tab or modal
4. Sees step-by-step guide tailored to their industry
5. Follows numbered steps to enable and customize
6. Uses variable reference to understand personalization
7. Tests automation and sees it work

### Editing a Message

1. Owner clicks "Edit message" on an automation
2. Sees message editor with enhanced variable picker
3. Variables grouped by category with descriptions
4. Preview section shows example of final message
5. One-click insert for any variable
6. Character count and SMS segment indicator
7. Save → immediately active

### Setting Up Zapier

1. Owner toggles ON "Push call summaries to CRM"
2. Clicks "Set up webhook" or sees "Connect Zapier" button
3. Opens guided setup modal with:
   - Step 1: Create a Zap in Zapier
   - Step 2: Choose "Webhooks by Zapier" trigger
   - Step 3: Copy this webhook URL from CloseLoop
   - Step 4: Send test to verify connection
   - Step 5: Build your Zap action
4. Copy-paste examples for common integrations
5. Test button confirms connection works

## Acceptance Criteria

1. **Every business mode has a complete setup guide** - Food, Service, Dispatch, Medical, and General all have step-by-step instructions
2. **Variables are understandable** - Each variable shows name, description, and example value
3. **Help is accessible everywhere** - From Workflows page, Help Center, and inline in the automation panel
4. **Non-technical language** - No jargon; uses terms like "order number" not "order_id"
5. **Copy-paste ready** - Example messages and webhook payloads can be copied directly
6. **Searchable** - Can search help content to find specific topics
7. **Mobile-friendly** - Works well on smaller screens

## Technical Notes

### Variable Descriptions Enhancement

Update `src/types/workflow.ts` to include descriptions:

```typescript
export interface VariableInfo {
  key: string;
  label: string;
  description: string;
  example: string;
  category: "customer" | "order" | "booking" | "dispatch" | "call" | "business";
  modes?: BusinessMode[]; // If only applicable to certain modes
}

export const VARIABLE_INFO: Record<string, VariableInfo> = {
  customer_name: {
    key: "customer_name",
    label: "Customer Name",
    description: "The customer's full name",
    example: "Sarah Johnson",
    category: "customer",
  },
  // ... all variables
};
```

### Help Context Hook

Create a hook to provide context-aware help:

```typescript
export function useWorkflowHelp(businessMode: BusinessMode) {
  const guide = INDUSTRY_GUIDES[businessMode];
  const variables = getVariablesForMode(businessMode);
  
  return {
    guide,
    variables,
    getAutomationHelp: (triggerId: string) => guide.automations.find(a => a.id === triggerId),
    getVariableDescription: (key: string) => VARIABLE_INFO[key],
  };
}
```

