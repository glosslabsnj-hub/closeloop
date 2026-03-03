import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Truck,
  ShoppingCart,
  UtensilsCrossed,
  Phone
} from "lucide-react";


// Intent types that support required questions
type Intent = "booking" | "dispatch" | "order" | "reservation" | "callback";

// Structure for an input field
export interface InputField {
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
}

// Configuration for an intent's required questions
export interface IntentRequiredInputsConfig {
  intent: Intent;
  required_inputs: InputField[];
  optional_inputs: InputField[];
}

// Capitalize first letter of each word
function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resolve "Customer Name" → "Patient Name", "Guest Name", etc. based on terminology
function getNameLabel(customerLabel: string): string {
  return `${capitalize(customerLabel)} Name`;
}

// Default standard fields per intent
const standardFields: Record<Intent, InputField[]> = {
  booking: [
    {
      key: "customer_name",
      label: "Customer Name", // resolved dynamically at render
      ask_prompt: "May I have your name please?",
      why_needed: "Required to identify the customer"
    },
    {
      key: "customer_phone",
      label: "Phone Number",
      ask_prompt: "What's the best phone number to reach you at?",
      why_needed: "Required for confirmation and updates"
    },
    {
      key: "service_requested",
      label: "Service",
      ask_prompt: "Which service are you interested in?",
      why_needed: "Required to schedule the right service"
    },
    {
      key: "preferred_date",
      label: "Preferred Date",
      ask_prompt: "What date works best for you?",
      why_needed: "Required to check availability"
    },
    {
      key: "preferred_time",
      label: "Preferred Time",
      ask_prompt: "What time would you prefer?",
      why_needed: "Required to schedule the service"
    },
    {
      key: "address",
      label: "Service Address",
      ask_prompt: "What's the address where you need service?",
      why_needed: "Required to dispatch technician"
    }
  ],
  dispatch: [
    {
      key: "customer_name",
      label: "Customer Name",
      ask_prompt: "May I have your name please?",
      why_needed: "Required to create the dispatch ticket"
    },
    {
      key: "customer_phone",
      label: "Phone Number",
      ask_prompt: "What's the best phone number to reach you at?",
      why_needed: "Required for driver contact"
    },
    {
      key: "pickup_address",
      label: "Pickup Address (Exact)",
      ask_prompt: "What's the exact street address for pickup? If you don't have the exact address, can you give me the nearest cross streets and city?",
      why_needed: "Required for accurate dispatch and pricing - must be exact street address or nearest cross streets"
    },
    {
      key: "dropoff_address",
      label: "Dropoff Address (Exact)",
      ask_prompt: "What's the exact street address for dropoff? If you don't have the exact address, can you give me the nearest cross streets and city?",
      why_needed: "Required for accurate routing and pricing - must be exact street address or nearest cross streets"
    },
    {
      key: "pickup_zip",
      label: "Pickup ZIP Code (Fallback)",
      ask_prompt: "What's the ZIP code for the pickup location?",
      why_needed: "Fallback when exact address not available - used with estimated miles for quote"
    },
    {
      key: "dropoff_zip",
      label: "Dropoff ZIP Code (Fallback)",
      ask_prompt: "What's the ZIP code for the dropoff location?",
      why_needed: "Fallback when exact address not available - used with estimated miles for quote"
    },
    {
      key: "estimated_miles",
      label: "Estimated Miles (Fallback)",
      ask_prompt: "About how many miles is it between pickup and dropoff?",
      why_needed: "Fallback when exact addresses not available - allows estimate quote"
    },
    {
      key: "urgency",
      label: "Urgency Level",
      ask_prompt: "Is this urgent or can it wait?",
      why_needed: "Required to prioritize dispatch"
    },
    {
      key: "vehicle_type",
      label: "Vehicle Type",
      ask_prompt: "What type of vehicle?",
      why_needed: "Required to send the right equipment"
    }
  ],
  order: [
    {
      key: "customer_name",
      label: "Customer Name",
      ask_prompt: "May I have your name for the order?",
      why_needed: "Required to identify the order"
    },
    {
      key: "customer_phone",
      label: "Phone Number",
      ask_prompt: "What's the best phone number to reach you at?",
      why_needed: "Required for order updates"
    },
    {
      key: "order_type",
      label: "Order Type",
      ask_prompt: "Is this for pickup or delivery?",
      why_needed: "Required to process the order"
    },
    {
      key: "delivery_address",
      label: "Delivery Address",
      ask_prompt: "What's the delivery address?",
      why_needed: "Required for delivery orders"
    }
  ],
  reservation: [
    {
      key: "customer_name",
      label: "Customer Name",
      ask_prompt: "May I have your name for the reservation?",
      why_needed: "Required to hold the table"
    },
    {
      key: "customer_phone",
      label: "Phone Number",
      ask_prompt: "What's the best phone number to reach you at?",
      why_needed: "Required for reservation confirmation"
    },
    {
      key: "party_size",
      label: "Party Size",
      ask_prompt: "How many people will be joining you?",
      why_needed: "Required to assign the right table"
    },
    {
      key: "reservation_date",
      label: "Date",
      ask_prompt: "What date would you like to reserve?",
      why_needed: "Required to check availability"
    },
    {
      key: "reservation_time",
      label: "Time",
      ask_prompt: "What time would you prefer?",
      why_needed: "Required to hold the table"
    }
  ],
  callback: [
    {
      key: "customer_name",
      label: "Customer Name",
      ask_prompt: "May I have your name?",
      why_needed: "Required to know who to call back"
    },
    {
      key: "customer_phone",
      label: "Phone Number",
      ask_prompt: "What's the best phone number to call you back at?",
      why_needed: "Required to return the call"
    },
    {
      key: "best_time",
      label: "Best Time to Call",
      ask_prompt: "When would be the best time to call you back?",
      why_needed: "Required to schedule the callback"
    },
    {
      key: "reason",
      label: "Reason for Callback",
      ask_prompt: "What can we help you with?",
      why_needed: "Required to route to the right person"
    }
  ]
};

const intentIcons: Record<Intent, React.ElementType> = {
  booking: Calendar,
  dispatch: Truck,
  order: ShoppingCart,
  reservation: UtensilsCrossed,
  callback: Phone
};

const intentLabels: Record<Intent, string> = {
  booking: "Booking",
  dispatch: "Dispatch",
  order: "Order",
  reservation: "Reservation",
  callback: "Callback"
};

const intentDescriptions: Record<Intent, string> = {
  booking: "Service scheduling and confirmations",
  dispatch: "Towing, delivery, and dispatch requests",
  order: "Food orders and product purchases",
  reservation: "Restaurant reservations",
  callback: "Callback requests"
};

export function RequiredQuestionsEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { terminology } = useIndustryContext();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const dynamicIntentLabels: Record<Intent, string> = {
    ...intentLabels,
    booking: cap(terminology.appointmentLabel),
  };
  const dynamicIntentDescs: Record<Intent, string> = {
    ...intentDescriptions,
    booking: `Service ${terminology.appointmentLabel}s and scheduling`,
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [configs, setConfigs] = useState<Record<Intent, IntentRequiredInputsConfig>>({} as any);
  const [activeIntent, setActiveIntent] = useState<Intent | null>(null);

  // Determine which intents are relevant based on business mode
  const relevantIntents: Intent[] = useMemo(() => {
    switch (businessMode) {
      case "food":
        return ["order", "reservation", "callback"];
      case "dispatch":
        return ["dispatch", "callback"];
      case "service":
        return ["booking", "callback"];
      case "medical":
        return ["booking", "callback"];
      case "sales":
        return ["booking", "callback"];
      case "general":
        return ["booking", "callback"];
      default:
        return ["booking", "callback"];
    }
  }, [businessMode]);

  // Set active intent to first relevant one when business mode changes
  useEffect(() => {
    if (!activeIntent || !relevantIntents.includes(activeIntent)) {
      setActiveIntent(relevantIntents[0]);
    }
  }, [relevantIntents, activeIntent]);

  // Load existing configurations
  useEffect(() => {
    if (!tenant?.id) return;

    const loadConfigs = async () => {
      setLoading(true);
      try {
        const baseQuery = supabase
          .from("business_intent_rules")
          .select("*")
          .eq("tenant_id", tenant.id);
        const { data: rules, error } = await (baseQuery as any).eq("rule_type", "required_inputs");

        if (error) throw error;

        const loadedConfigs: Record<Intent, IntentRequiredInputsConfig> = {} as any;

        // Initialize with defaults for relevant intents
        for (const intent of relevantIntents) {
          const existingRule = rules?.find((r) => (r.action_json as any)?.intent === intent);

          if (existingRule && existingRule.action_json) {
            loadedConfigs[intent] = existingRule.action_json as unknown as IntentRequiredInputsConfig;
          } else {
            // Default: some standard fields required, others optional
            const standard = (standardFields[intent] || []).map((f) =>
              f.key === "customer_name" ? { ...f, label: getNameLabel(terminology.customerLabel) } : f
            );
            loadedConfigs[intent] = {
              intent,
              required_inputs: standard.slice(0, 3), // First 3 required by default
              optional_inputs: standard.slice(3), // Rest optional
            };
          }
        }

        setConfigs(loadedConfigs);
      } catch (error) {
        console.error("Failed to load required questions:", error);
        toast.error("Failed to load configurations");
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, [tenant?.id, businessMode]);

  const currentConfig = activeIntent ? configs[activeIntent] : null;

  const toggleFieldRequired = (field: InputField, isRequired: boolean) => {
    if (!currentConfig || !activeIntent) return;
    const newConfig = { ...currentConfig };

    if (isRequired) {
      // Move from optional to required
      newConfig.optional_inputs = newConfig.optional_inputs.filter((f) => f.key !== field.key);
      newConfig.required_inputs.push(field);
    } else {
      // Move from required to optional
      newConfig.required_inputs = newConfig.required_inputs.filter((f) => f.key !== field.key);
      newConfig.optional_inputs.push(field);
    }

    setConfigs({ ...configs, [activeIntent]: newConfig });
    setHasChanges(true);
  };

  const updateField = (
    field: InputField,
    updates: Partial<InputField>,
    isRequired: boolean
  ) => {
    if (!currentConfig || !activeIntent) return;
    const newConfig = { ...currentConfig };
    const targetArray = isRequired ? newConfig.required_inputs : newConfig.optional_inputs;
    const index = targetArray.findIndex((f) => f.key === field.key);

    if (index !== -1) {
      targetArray[index] = { ...targetArray[index], ...updates };
      setConfigs({ ...configs, [activeIntent]: newConfig });
      setHasChanges(true);
    }
  };

  const addCustomField = (isRequired: boolean) => {
    if (!currentConfig || !activeIntent) return;
    const newField: InputField = {
      key: `custom_${Date.now()}`,
      label: "New Custom Question",
      ask_prompt: "Please provide...",
      why_needed: "Required for processing"
    };

    const newConfig = { ...currentConfig };
    if (isRequired) {
      newConfig.required_inputs.push(newField);
    } else {
      newConfig.optional_inputs.push(newField);
    }

    setConfigs({ ...configs, [activeIntent]: newConfig });
    setHasChanges(true);
  };

  const removeField = (field: InputField, isRequired: boolean) => {
    if (!currentConfig || !activeIntent) return;
    const newConfig = { ...currentConfig };
    if (isRequired) {
      newConfig.required_inputs = newConfig.required_inputs.filter((f) => f.key !== field.key);
    } else {
      newConfig.optional_inputs = newConfig.optional_inputs.filter((f) => f.key !== field.key);
    }
    setConfigs({ ...configs, [activeIntent]: newConfig });
    setHasChanges(true);
  };

  const saveConfigurations = async () => {
    if (!tenant?.id) return;

    setSaving(true);
    try {
      // Delete existing required_inputs rules
      const deleteQuery = supabase
        .from("business_intent_rules")
        .delete()
        .eq("tenant_id", tenant.id);
      await (deleteQuery as any).eq("rule_type", "required_inputs");

      // Insert new rules for each intent
      const rulesToInsert = relevantIntents.map((intent) => ({
        tenant_id: tenant.id,
        rule_type: "required_inputs",
        name: `Required Questions: ${dynamicIntentLabels[intent]}`,
        description: `Input requirements for ${dynamicIntentLabels[intent].toLowerCase()} intent`,
        condition_json: {},
        action_json: configs[intent] as any,
        priority: 0,
        is_enabled: true,
        is_suggested: false
      }));

      const { error } = await supabase
        .from("business_intent_rules")
        .insert(rulesToInsert as any);

      if (error) throw error;

      toast.success("Required questions saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save required questions:", error);
      toast.error("Failed to save configurations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-sm text-muted-foreground">Loading configurations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentConfig) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No configuration available for this intent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">What AI Collects</h3>
          <p className="text-sm text-muted-foreground">
            Choose what info your AI asks for on each type of call
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveConfigurations} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Intent Tabs */}
      <Tabs value={activeIntent || relevantIntents[0]} onValueChange={(v) => setActiveIntent(v as Intent)}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
          {relevantIntents.map((intent) => {
            const Icon = intentIcons[intent];
            const config = configs[intent];
            const requiredCount = config?.required_inputs?.length || 0;

            return (
              <TabsTrigger key={intent} value={intent} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{dynamicIntentLabels[intent]}</span>
                <Badge variant="secondary" className="text-xs">
                  {requiredCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {relevantIntents.map((intent) => {
          const config = configs[intent];
          if (!config) return null;

          return (
            <TabsContent key={intent} value={intent} className="mt-6 space-y-6">
              {/* Intent Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {dynamicIntentLabels[intent]} Questions
                  </CardTitle>
                  <CardDescription>{dynamicIntentDescs[intent]}</CardDescription>
                </CardHeader>
              </Card>

              {/* Required Fields */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        Must Have Before Booking
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30">
                          {config.required_inputs.length} required
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        AI won't complete the {intent} without these
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCustomField(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Custom
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.required_inputs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No required fields. Add standard or custom questions above.
                    </div>
                  ) : (
                    config.required_inputs.map((field) => (
                      <FieldEditor
                        key={field.key}
                        field={field}
                        isRequired={true}
                        onToggleRequired={(isReq) => toggleFieldRequired(field, isReq)}
                        onUpdate={(updates) => updateField(field, updates, true)}
                        onRemove={() => removeField(field, true)}
                        isCustom={field.key.startsWith("custom_")}
                        customerLabel={terminology.customerLabel}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Optional Fields */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                        Nice to Have
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {config.optional_inputs.length} optional
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        AI asks when relevant but can proceed without them
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCustomField(false)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Custom
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.optional_inputs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No optional fields. Add custom questions above.
                    </div>
                  ) : (
                    config.optional_inputs.map((field) => (
                      <FieldEditor
                        key={field.key}
                        field={field}
                        isRequired={false}
                        onToggleRequired={(isReq) => toggleFieldRequired(field, isReq)}
                        onUpdate={(updates) => updateField(field, updates, false)}
                        onRemove={() => removeField(field, false)}
                        isCustom={field.key.startsWith("custom_")}
                        customerLabel={terminology.customerLabel}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

interface FieldEditorProps {
  field: InputField;
  isRequired: boolean;
  onToggleRequired: (isRequired: boolean) => void;
  onUpdate: (updates: Partial<InputField>) => void;
  onRemove: () => void;
  isCustom: boolean;
  customerLabel: string;
}

// Helper function to get validation hints for a field
function getValidationHint(fieldKey: string): { type: string; examples: string; invalid: string } | null {
  const key = fieldKey.toLowerCase();

  if (key.includes('address') && !key.includes('email')) {
    return {
      type: "Address",
      examples: "✓ '123 Main St, Chicago' or '✓ Main & Oak, 62701'",
      invalid: "✗ 'downtown' or ✗ '123 Main' (no city/ZIP)"
    };
  }

  if (key.includes('date')) {
    return {
      type: "Date",
      examples: "✓ 'tomorrow' or ✓ 'December 25th'",
      invalid: "✗ 'soon' or ✗ 'later'"
    };
  }

  if (key.includes('time') && !key.includes('estimated')) {
    return {
      type: "Time",
      examples: "✓ '2pm' or ✓ 'morning'",
      invalid: "✗ 'later' or ✗ 'whenever'"
    };
  }

  if (key.includes('miles') || key === 'estimated_miles') {
    return {
      type: "Distance",
      examples: "✓ '5 miles' or ✓ 'about 10'",
      invalid: "✗ 'not far' (needs number)"
    };
  }

  if (key.includes('email')) {
    return {
      type: "Email",
      examples: "✓ 'john@example.com'",
      invalid: "✗ Missing @ or domain"
    };
  }

  if (key.includes('phone')) {
    return {
      type: "Phone",
      examples: "✓ '555-123-4567'",
      invalid: "✗ Fewer than 7 digits"
    };
  }

  if (key === 'party_size') {
    return {
      type: "Party Size",
      examples: "✓ '2' or ✓ 'party of 4'",
      invalid: "✗ 'a few' (needs number)"
    };
  }

  return null;
}

function FieldEditor({
  field,
  isRequired,
  onToggleRequired,
  onUpdate,
  onRemove,
  isCustom,
  customerLabel
}: FieldEditorProps) {
  const validationHint = getValidationHint(field.key);

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={isRequired}
            onCheckedChange={onToggleRequired}
          />
          <div>
            <Label className="font-medium">{field.label}</Label>
            <p className="text-xs text-muted-foreground">
              {isRequired ? "Required field" : "Optional field"}
            </p>
          </div>
        </div>
        {isCustom && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Validation Hint */}
      {validationHint && (
        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs font-medium text-blue-400 mb-1">
            {validationHint.type} Validation
          </p>
          <p className="text-xs text-muted-foreground">
            {validationHint.examples}
          </p>
          <p className="text-xs text-muted-foreground">
            {validationHint.invalid}
          </p>
        </div>
      )}

      <Separator />

      {/* Field Configuration */}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${field.key}-label`} className="text-xs">
            Field Label
          </Label>
          <Input
            id={`${field.key}-label`}
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={`e.g., ${getNameLabel(customerLabel)}`}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${field.key}-ask`} className="text-xs">
            AI will ask:
          </Label>
          <Textarea
            id={`${field.key}-ask`}
            value={field.ask_prompt}
            onChange={(e) => onUpdate({ ask_prompt: e.target.value })}
            placeholder="e.g., May I have your name please?"
            rows={2}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${field.key}-why`} className="text-xs">
            You need this because:
          </Label>
          <Textarea
            id={`${field.key}-why`}
            value={field.why_needed}
            onChange={(e) => onUpdate({ why_needed: e.target.value })}
            placeholder={`e.g., Required to identify the ${customerLabel}`}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
