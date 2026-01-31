import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Truck, UtensilsCrossed, Stethoscope, Users, ClipboardList, Info } from "lucide-react";
import { useDeliveryRules, type EntityType, type DeliveryRule } from "@/hooks/useUniversalDelivery";
import { useTenantConfig, useModuleEnabled } from "@/hooks/useTenantConfig";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EntityConfig {
  type: EntityType;
  label: string;
  icon: React.ReactNode;
  module: string | string[];
  description: string;
  defaultAutoConfirm: boolean;
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    type: "booking",
    label: "Bookings / Appointments",
    icon: <Calendar className="h-5 w-5" />,
    module: "booking",
    description: "Service appointments scheduled by callers",
    defaultAutoConfirm: false,
  },
  {
    type: "dispatch",
    label: "Dispatch Jobs",
    icon: <Truck className="h-5 w-5" />,
    module: "dispatch_queue",
    description: "Urgent jobs requiring crew dispatch",
    defaultAutoConfirm: false,
  },
  {
    type: "order",
    label: "Food Orders",
    icon: <UtensilsCrossed className="h-5 w-5" />,
    module: "food_orders",
    description: "Pickup and delivery orders",
    defaultAutoConfirm: true,
  },
  {
    type: "reservation",
    label: "Reservations",
    icon: <Users className="h-5 w-5" />,
    module: "reservations",
    description: "Table reservations at restaurants",
    defaultAutoConfirm: false,
  },
  {
    type: "catering",
    label: "Catering Requests",
    icon: <ClipboardList className="h-5 w-5" />,
    module: "catering",
    description: "Large event catering inquiries",
    defaultAutoConfirm: false,
  },
  {
    type: "intake",
    label: "Medical Intake",
    icon: <Stethoscope className="h-5 w-5" />,
    module: "medical_intake",
    description: "Patient intake and scheduling requests",
    defaultAutoConfirm: false,
  },
];

interface RuleCardProps {
  config: EntityConfig;
  rule: DeliveryRule | undefined;
  onUpdate: (entityType: EntityType, updates: Partial<DeliveryRule>) => void;
  isUpdating: boolean;
}

function RuleCard({ config, rule, onUpdate, isUpdating }: RuleCardProps) {
  const [autoConfirm, setAutoConfirm] = useState(rule?.auto_confirm ?? config.defaultAutoConfirm);
  const [notifyOnNew, setNotifyOnNew] = useState(rule?.notify_on_new ?? true);

  useEffect(() => {
    if (rule) {
      setAutoConfirm(rule.auto_confirm);
      setNotifyOnNew(rule.notify_on_new);
    }
  }, [rule]);

  const handleAutoConfirmChange = (checked: boolean) => {
    setAutoConfirm(checked);
    onUpdate(config.type, {
      auto_confirm: checked,
      review_queue_enabled: !checked,
    });
  };

  const handleNotifyChange = (checked: boolean) => {
    setNotifyOnNew(checked);
    onUpdate(config.type, { notify_on_new: checked });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground">{config.icon}</div>
            <div>
              <CardTitle className="text-base">{config.label}</CardTitle>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </div>
          </div>
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor={`auto-confirm-${config.type}`} className="font-medium">
              Auto-confirm
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>
                  {autoConfirm
                    ? "AI finalizes and sends immediately after caller confirmation."
                    : "Items land in Review Queue. You approve before sending."}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={autoConfirm ? "default" : "secondary"} className="text-xs">
              {autoConfirm ? "Instant" : "Review First"}
            </Badge>
            <Switch
              id={`auto-confirm-${config.type}`}
              checked={autoConfirm}
              onCheckedChange={handleAutoConfirmChange}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <Label htmlFor={`notify-${config.type}`} className="font-medium">
            Notify on new
          </Label>
          <Switch
            id={`notify-${config.type}`}
            checked={notifyOnNew}
            onCheckedChange={handleNotifyChange}
          />
        </div>

        {/* Status explanation */}
        <div className="text-xs text-muted-foreground p-2 rounded bg-muted/50">
          {autoConfirm ? (
            <span>✓ The AI will finalize and send immediately after the caller confirms.</span>
          ) : (
            <span>✓ Items will appear in your Review Queue for approval before sending.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationRulesSettings() {
  const { rules, isLoading, updateRule, getRuleForEntity, isUpdating } = useDeliveryRules();
  const { enabledModules } = useTenantConfig();

  const handleUpdate = (entityType: EntityType, updates: Partial<DeliveryRule>) => {
    updateRule.mutate({ entityType, updates });
  };

  // Filter entities by enabled modules
  const enabledEntities = ENTITY_CONFIGS.filter((config) => {
    if (Array.isArray(config.module)) {
      return config.module.some((m) => enabledModules.includes(m));
    }
    return enabledModules.includes(config.module);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (enabledEntities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No outcome types are enabled for your business mode.</p>
          <p className="text-sm mt-2">Enable modules in your business settings to configure automation rules.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-700 dark:text-amber-300">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">How automation works</p>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• <strong>Auto-confirm ON:</strong> AI finalizes immediately after caller confirmation</li>
            <li>• <strong>Auto-confirm OFF:</strong> Items land in Review Queue for your approval</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {enabledEntities.map((config) => (
          <RuleCard
            key={config.type}
            config={config}
            rule={getRuleForEntity(config.type)}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}