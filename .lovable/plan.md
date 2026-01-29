

# Advanced Intelligence Layers Implementation
## Business Memory (Temporal Intelligence) & Negotiation Intent Rules

---

## Summary

This plan adds two additive intelligence layers that make the AI smarter over time while remaining predictable, safe, and business-controlled. These features integrate seamlessly with the existing architecture without changing onboarding, pricing, or core flows.

---

## Configuration Decisions (Based on User Answers)

| Setting | Value |
|---------|-------|
| Memory Scope | Per location, with optional cross-location sharing toggle |
| HIPAA/Medical Mode | Disable customer-specific memory entirely; only aggregate/time patterns allowed |
| Copilot Rule Recommendations | Yes, labeled as "Suggested", requires owner approval |
| Observation Threshold | 3 observations minimum |
| Confidence Threshold | ≥ 0.65 before AI can use as hint |
| Memory → Upsells | No. Memory only influences personalization and scheduling |

---

## Phase 1: Database Schema

### 1.1 New Tables

**business_memory** - Stores learned patterns per location

```sql
CREATE TYPE memory_type AS ENUM (
  'customer_preference',
  'time_pattern',
  'service_pattern',
  'capacity_pattern',
  'exception_pattern'
);

CREATE TABLE business_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE CASCADE,
  memory_type memory_type NOT NULL,
  subject_key TEXT, -- e.g. customer_id, service_id, weekday, hour_range
  summary TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_observed_at TIMESTAMPTZ DEFAULT now(),
  observation_count INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- HIPAA: customer preferences blocked for medical tenants
  CONSTRAINT no_customer_pref_for_hipaa CHECK (
    NOT (memory_type = 'customer_preference' AND subject_key LIKE 'customer_%')
    OR location_id IS NULL
  )
);

CREATE INDEX idx_business_memory_tenant ON business_memory(tenant_id);
CREATE INDEX idx_business_memory_location ON business_memory(location_id);
CREATE INDEX idx_business_memory_active ON business_memory(tenant_id, is_active, confidence_score DESC);

-- RLS
ALTER TABLE business_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their memory"
ON business_memory FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can manage their memory"
ON business_memory FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));
```

**business_intent_rules** - Configurable negotiation rules

```sql
CREATE TYPE intent_rule_type AS ENUM (
  'time_preference',
  'upsell_rule',
  'discount_guardrail',
  'urgency_handling',
  'capacity_protection'
);

CREATE TABLE business_intent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_type intent_rule_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  priority INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  is_suggested BOOLEAN DEFAULT false, -- Copilot-suggested rules
  suggested_reason TEXT, -- Why Copilot suggested this
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intent_rules_tenant ON business_intent_rules(tenant_id);
CREATE INDEX idx_intent_rules_enabled ON business_intent_rules(tenant_id, is_enabled, priority DESC);

-- RLS
ALTER TABLE business_intent_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their rules"
ON business_intent_rules FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can manage their rules"
ON business_intent_rules FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));
```

**tenant_intelligence_settings** - Global settings for memory & rules

```sql
CREATE TABLE tenant_intelligence_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  memory_enabled BOOLEAN DEFAULT false, -- OFF by default
  share_memory_across_locations BOOLEAN DEFAULT false,
  copilot_can_suggest_rules BOOLEAN DEFAULT true,
  min_observation_threshold INT DEFAULT 3,
  min_confidence_threshold FLOAT DEFAULT 0.65,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE tenant_intelligence_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can manage intelligence settings"
ON tenant_intelligence_settings FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));
```

---

## Phase 2: Edge Functions

### 2.1 New Edge Function: `retrieve-business-memory`

Fetches relevant memory hints for AI decision-making.

**Location:** `supabase/functions/retrieve-business-memory/index.ts`

```typescript
// Inputs: tenantId, locationId?, customerId?, currentContext
// Logic:
// 1. Check if memory_enabled for tenant
// 2. If HIPAA mode, exclude customer_preference type
// 3. Filter by confidence >= threshold
// 4. Return only is_active memories
// 5. Sort by relevance to current context

// Returns:
{
  hints: [
    {
      type: "time_pattern",
      summary: "Friday afternoons typically fill faster",
      confidence: 0.78,
      usage: "suggest_alternatives" // How AI should use this
    }
  ],
  memory_enabled: true
}
```

### 2.2 New Edge Function: `record-observation`

Records observations that may become memories after threshold.

**Location:** `supabase/functions/record-observation/index.ts`

```typescript
// Inputs: tenantId, locationId, observationType, subjectKey, observation
// Logic:
// 1. Check if similar observation exists
// 2. If exists: increment count, update last_observed_at, recalculate confidence
// 3. If new: create with count=1, confidence=0.2
// 4. Confidence formula: min(1.0, 0.2 + (count * 0.15))
// 5. Only becomes usable when count >= threshold AND confidence >= 0.65
// 6. For medical mode: block customer_preference entirely
```

### 2.3 New Edge Function: `retrieve-intent-rules`

Fetches active negotiation rules for AI.

**Location:** `supabase/functions/retrieve-intent-rules/index.ts`

```typescript
// Inputs: tenantId, context (intent, service, time, capacity)
// Logic:
// 1. Fetch all enabled, non-suggested rules
// 2. Evaluate each rule's condition_json against context
// 3. Return matching rules sorted by priority

// Returns:
{
  rules: [
    {
      type: "time_preference",
      action: "suggest_earlier",
      reason: "Requested time is during peak hours"
    }
  ]
}
```

### 2.4 Update: `build-business-brain/index.ts`

Extend the brain to include intelligence layers (if enabled).

```typescript
// Add to brain object:
brain.intelligence = {
  memory_enabled: settings.memory_enabled,
  active_rules_count: rules.length,
  hints: memoryHints, // From retrieve-business-memory
  rules: intentRules, // From retrieve-intent-rules
};
```

### 2.5 Update: `ai-plan-response/index.ts`

Incorporate intelligence layers into response planning.

```typescript
// Decision order (as specified):
// 1. Hard constraints (availability, hours, services, compliance)
// 2. Structured Business Brain (services, pricing, policies)
// 3. Business Intent Rules (negotiation, upsell, discount limits)
// 4. Business Memory (HINTS ONLY - patterns, tendencies)
// 5. Conversation context

// Memory usage rules:
// - Use memory to: suggest alternatives, personalize responses
// - NEVER use memory to: deny service, override availability, upsell

// Add to system prompt:
if (brain.intelligence?.hints?.length > 0) {
  systemPrompt += `\nBUSINESS HINTS (use subtly, never mention learning):\n`;
  for (const hint of brain.intelligence.hints) {
    systemPrompt += `- ${hint.summary}\n`;
  }
}
```

---

## Phase 3: Frontend Components

### 3.1 New Component: `BusinessMemoryTab.tsx`

**Location:** `src/components/knowledge/BusinessMemoryTab.tsx`

Shows learned patterns with management controls.

```
┌─────────────────────────────────────────────────────┐
│ Business Memory                          [Enabled ⬜] │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ ⏰ Time Pattern            Confidence: ████░ 78% ││
│ │ "Friday afternoons typically fill faster"        ││
│ │ Observed 12 times · Last: 2 days ago             ││
│ │                                    [Active ✓] [🗑]││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🔧 Service Pattern         Confidence: ████░ 72% ││
│ │ "Customers asking for oil change often ask       ││
│ │  about tire rotation"                            ││
│ │ Observed 8 times · Last: 5 days ago              ││
│ │                                    [Active ✓] [🗑]││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ 💡 Memory is used as hints only, never hard rules   │
│ 🔒 Medical mode: Customer preferences disabled      │
└─────────────────────────────────────────────────────┘
```

### 3.2 New Component: `IntentRulesManager.tsx`

**Location:** `src/components/settings/IntentRulesManager.tsx`

Allows configuring negotiation rules.

```
┌─────────────────────────────────────────────────────┐
│ AI Negotiation Rules                    [+ Add Rule]│
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌─ ACTIVE RULES ────────────────────────────────────┐
│ │                                                    │
│ │ 📅 Peak Hours Preference              [Enabled ✓] │
│ │ When: Requested time 3pm-6pm                      │
│ │ Then: Suggest earlier/later alternatives          │
│ │                                        [Edit] [🗑] │
│ │                                                    │
│ │ 📦 Service Upsell                     [Enabled ✓] │
│ │ When: Service = Basic Clean                       │
│ │ Then: Suggest carpet shampoo add-on               │
│ │                                        [Edit] [🗑] │
│ │                                                    │
│ └────────────────────────────────────────────────────┘
│                                                      │
│ ┌─ SUGGESTED BY COPILOT ────────────────────────────┐
│ │ 💡 Capacity Protection         [Review] [Dismiss] │
│ │ "Discourage same-day bookings when >80% full"     │
│ │ Reason: Pattern detected from last 30 days        │
│ └────────────────────────────────────────────────────┘
│                                                      │
│ ⚠️ Rules guide AI behavior but never override       │
│    availability or invent pricing                   │
└─────────────────────────────────────────────────────┘
```

### 3.3 Update: `BusinessBrainPage.tsx`

Add "Memory" tab to the Business Brain page.

```typescript
// Add new tab
<TabsTrigger value="memory">
  Memory
  {memoryEnabled && memoryCount > 0 && (
    <Badge variant="secondary" className="ml-2">{memoryCount}</Badge>
  )}
</TabsTrigger>

<TabsContent value="memory">
  <BusinessMemoryTab />
</TabsContent>
```

### 3.4 Update: `SettingsPage.tsx`

Add Intelligence Settings section.

```typescript
// New settings section
<Card>
  <CardHeader>
    <CardTitle>AI Intelligence</CardTitle>
    <CardDescription>
      Configure how your AI learns and negotiates
    </CardDescription>
  </CardHeader>
  <CardContent>
    <IntelligenceSettingsForm />
    <Separator className="my-4" />
    <IntentRulesManager />
  </CardContent>
</Card>
```

---

## Phase 4: Copilot Enhancement

### 4.1 Update: `Copilot.tsx`

Add responses for intelligence-related queries.

```typescript
// "What has the AI learned?"
if (query.includes('learned') || query.includes('memory')) {
  if (!ctx.intelligence?.memory_enabled) {
    return {
      content: "Business Memory is currently disabled. Enable it in Settings → AI Intelligence.",
      links: [{ label: "Enable Memory", path: "/app/settings" }]
    };
  }
  return {
    content: `Your AI has learned ${memoryCount} patterns from ${observationCount} observations.`,
    steps: ["View patterns in Business Brain → Memory", "Toggle individual patterns on/off"],
    links: [{ label: "View Memory", path: "/app/business-brain?tab=memory" }]
  };
}

// "Why did the AI suggest this?"
if (query.includes('why') && query.includes('suggest')) {
  return {
    content: "AI suggestions are based on your configured rules and (if enabled) learned patterns.",
    steps: [
      "1. Check your intent rules in Settings",
      "2. Review learned patterns in Business Brain → Memory",
      "3. Patterns only influence suggestions, never override your settings"
    ]
  };
}

// "Can I turn this off?"
if (query.includes('turn off') || query.includes('disable')) {
  return {
    content: "You can disable Business Memory and individual patterns anytime.",
    steps: [
      "Go to Settings → AI Intelligence",
      "Toggle 'Memory Enabled' off",
      "Or disable individual patterns in Business Brain → Memory"
    ],
    links: [{ label: "Go to Settings", path: "/app/settings" }]
  };
}
```

### 4.2 Update: `copilot-context/index.ts`

Add intelligence context to Copilot.

```typescript
// Add to CopilotContext interface
intelligence: {
  memory_enabled: boolean;
  memory_count: number;
  active_rules_count: number;
  suggested_rules_count: number;
}
```

---

## Phase 5: Hooks and Utilities

### 5.1 New Hook: `useBusinessMemory.ts`

```typescript
export function useBusinessMemory(tenantId: string | null) {
  // Fetch memories for tenant
  // Filter by is_active and confidence threshold
  // Provide toggleMemory, deleteMemory functions
}
```

### 5.2 New Hook: `useIntentRules.ts`

```typescript
export function useIntentRules(tenantId: string | null) {
  // Fetch rules (active and suggested)
  // Provide createRule, updateRule, deleteRule, approveRule functions
}
```

### 5.3 New Hook: `useIntelligenceSettings.ts`

```typescript
export function useIntelligenceSettings(tenantId: string | null) {
  // Fetch tenant_intelligence_settings
  // Provide updateSettings function
  // Handle HIPAA mode restrictions
}
```

---

## Phase 6: HIPAA Compliance

### 6.1 HIPAA Mode Enforcement

When `business_mode = 'medical'` AND `hipaa_mode = true`:

1. **Block customer_preference memory type entirely**
2. **Allow only aggregate patterns:**
   - `time_pattern` (e.g., "Mondays are busiest")
   - `capacity_pattern` (e.g., "Afternoon slots fill faster")
   - `service_pattern` (e.g., "New patient visits take longer")
3. **Hide customer-related memory in UI** with explanation:
   "Customer-specific memory is disabled for HIPAA compliance"

### 6.2 Implementation in Edge Functions

```typescript
// In record-observation
if (tenant.business_mode === 'medical' && tenant.hipaa_mode) {
  if (observationType === 'customer_preference') {
    return { blocked: true, reason: 'HIPAA compliance' };
  }
}

// In retrieve-business-memory
const validTypes = hipaaMode 
  ? ['time_pattern', 'capacity_pattern', 'service_pattern', 'exception_pattern']
  : ['customer_preference', 'time_pattern', 'capacity_pattern', 'service_pattern', 'exception_pattern'];
```

---

## Phase 7: Multi-Location Support

### 7.1 Location Scoping

Memories are scoped to `location_id` by default:
- Each location learns independently
- Optional toggle: "Share patterns across locations"

### 7.2 Cross-Location Sharing

When `share_memory_across_locations = true`:
- Memory with `location_id = NULL` applies to all locations
- Time patterns and capacity patterns can be aggregated
- Customer preferences remain location-specific

---

## AI Decision Order Enforcement

The system prompt will explicitly enforce this order:

```
DECISION PRIORITY (NEVER VIOLATE):
1. HARD CONSTRAINTS - availability, hours, services, compliance
2. BUSINESS BRAIN - your configured services, pricing, policies  
3. INTENT RULES - your negotiation preferences
4. MEMORY HINTS - observed patterns (suggestions only, never enforce)
5. CONVERSATION - current customer context

If any conflict: earlier layers ALWAYS win.
Memory is for subtle personalization only - NEVER deny, override, or pressure.
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/retrieve-business-memory/index.ts` | Fetch memory hints |
| `supabase/functions/record-observation/index.ts` | Record pattern observations |
| `supabase/functions/retrieve-intent-rules/index.ts` | Fetch negotiation rules |
| `src/components/knowledge/BusinessMemoryTab.tsx` | Memory management UI |
| `src/components/settings/IntentRulesManager.tsx` | Rules configuration UI |
| `src/components/settings/IntelligenceSettingsForm.tsx` | Global settings |
| `src/hooks/useBusinessMemory.ts` | Memory hook |
| `src/hooks/useIntentRules.ts` | Rules hook |
| `src/hooks/useIntelligenceSettings.ts` | Settings hook |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/build-business-brain/index.ts` | Add intelligence section |
| `supabase/functions/ai-plan-response/index.ts` | Incorporate rules & memory |
| `supabase/functions/copilot-context/index.ts` | Add intelligence context |
| `src/pages/app/BusinessBrainPage.tsx` | Add Memory tab |
| `src/pages/app/SettingsPage.tsx` | Add Intelligence section |
| `src/components/dashboard/Copilot.tsx` | Handle intelligence queries |

---

## Safety Guardrails

1. **Memory is OFF by default** - Business owners must explicitly enable
2. **Minimum thresholds** - 3 observations + 0.65 confidence before use
3. **No upsell influence** - Memory only affects personalization and timing
4. **HIPAA isolation** - No customer-specific memory in medical mode
5. **Owner control** - Every pattern can be toggled or deleted
6. **Transparency** - Copilot explains all AI decisions in plain language
7. **Decision hierarchy** - Memory never overrides explicit settings

---

## Result

After implementation:
- AI learns patterns over time without storing raw data
- Business owners have full visibility and control via Business Brain → Memory
- Negotiation rules allow intelligent scheduling and alternative suggestions
- HIPAA-compliant medical tenants get aggregate patterns only
- Copilot can explain AI decisions and recommend new rules
- All features are additive - no changes to existing flows

