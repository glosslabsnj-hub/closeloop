import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, AlertTriangle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

type ServiceDefaultFlow = "schedule_first" | "urgency_check" | "dispatch_first";

interface ServiceCallFlowSettingsProps {
  compact?: boolean;
  onSave?: () => void;
}

export default function ServiceCallFlowSettings({ compact, onSave }: ServiceCallFlowSettingsProps) {
  const { tenant, assistantSettings } = useAuth();
  const { toast } = useToast();
  const { terminology } = useIndustryContext();
  const apptLabel = terminology.appointmentLabel || "appointment";
  const apptLabelPlural = apptLabel === "job" ? "jobs" : apptLabel === "visit" ? "visits" : apptLabel === "session" ? "sessions" : `${apptLabel}s`;
  const article = /^[aeiou]/i.test(apptLabel) ? "an" : "a";

  const [serviceFlow, setServiceFlow] = useState<ServiceDefaultFlow>("schedule_first");
  const [saving, setSaving] = useState(false);

  // Determine recommended flow based on industry
  const getIndustryDefault = (industry: string | undefined): ServiceDefaultFlow => {
    if (!industry) return "schedule_first";

    const urgencyCheckIndustries = [
      "hvac", "heating", "cooling", "plumbing", "plumber", "electrical", "electrician",
      "appliance_repair", "garage_door", "water_damage", "restoration"
    ];

    const dispatchFirstIndustries = [
      "locksmith", "towing", "roadside"
    ];

    const lowerIndustry = industry.toLowerCase();

    if (dispatchFirstIndustries.some(i => lowerIndustry.includes(i))) {
      return "dispatch_first";
    }
    if (urgencyCheckIndustries.some(i => lowerIndustry.includes(i))) {
      return "urgency_check";
    }
    return "schedule_first";
  };

  const industryRecommended = getIndustryDefault(tenant?.industry);

  // Return a realistic example customer request based on their industry
  const getExampleCustomerRequest = (industry: string | undefined): string => {
    if (!industry) return "I need my drain cleaned";
    const lower = industry.toLowerCase();
    if (lower.includes("electrical") || lower.includes("electrician")) return "I need my panel upgraded";
    if (lower.includes("hvac") || lower.includes("heating") || lower.includes("cooling") || lower.includes("air condition")) return "My AC isn't cooling properly";
    if (lower.includes("plumb")) return "I need my drain cleaned";
    if (lower.includes("locksmith")) return "I'm locked out of my house";
    if (lower.includes("roofing") || lower.includes("roof")) return "I have a roof leak";
    if (lower.includes("appliance")) return "My dishwasher stopped working";
    if (lower.includes("pest")) return "I think I have a pest problem";
    if (lower.includes("landscap") || lower.includes("lawn")) return "I need my lawn maintained";
    if (lower.includes("clean")) return "I need my house deep cleaned";
    if (lower.includes("painting") || lower.includes("painter")) return "I need my living room painted";
    if (lower.includes("garage")) return "My garage door won't open";
    if (lower.includes("water_damage") || lower.includes("restoration")) return "I have water damage in my basement";
    if (lower.includes("salon") || lower.includes("hair") || lower.includes("barber")) return "I'd like to book a haircut";
    if (lower.includes("dental") || lower.includes("dentist")) return "I need to schedule a cleaning";
    return "I'd like to schedule a service call";
  };
  const exampleCustomerRequest = getExampleCustomerRequest(tenant?.industry);

  useEffect(() => {
    if (assistantSettings) {
      const savedFlow = (assistantSettings as any).service_default_flow;
      if (savedFlow) {
        setServiceFlow(savedFlow);
      } else {
        setServiceFlow(industryRecommended);
      }
    }
  }, [assistantSettings, tenant?.industry]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          service_default_flow: serviceFlow,
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      toast({ title: "Service call flow updated!" });
      onSave?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tenant?.id && assistantSettings) {
        handleSave();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [serviceFlow]);

  // Hide for non-service businesses OR when in callback-only mode
  const isCallbackOnly = (assistantSettings as any)?.ai_behavior_mode === "callback_only";
  if ((tenant?.business_mode !== "service" && tenant?.business_mode !== "general") || isCallbackOnly) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Service Call Flow</span>
        </div>
        <Badge variant={serviceFlow === "schedule_first" ? "default" : "secondary"}>
          {serviceFlow === "schedule_first" && "Schedule First"}
          {serviceFlow === "urgency_check" && "Ask Urgency"}
          {serviceFlow === "dispatch_first" && "Dispatch First"}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Service Call Behavior
        </CardTitle>
        <CardDescription>
          How should your AI handle incoming service requests?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={serviceFlow} 
          onValueChange={(value) => setServiceFlow(value as ServiceDefaultFlow)}
          className="space-y-3"
        >
          {/* Schedule First */}
          <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            serviceFlow === "schedule_first" 
              ? "border-primary bg-primary/5" 
              : "hover:bg-muted/50"
          }`}>
            <RadioGroupItem value="schedule_first" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Schedule {apptLabelPlural.charAt(0).toUpperCase() + apptLabelPlural.slice(1)}</span>
                {industryRecommended === "schedule_first" ? (
                  <Badge variant="default" className="text-xs">Recommended for your business</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Common for salons, detailing, cleaning</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                AI goes straight to scheduling. No urgency questions.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                "When would you like to come in?"
              </p>
            </div>
          </label>

          {/* Urgency Check */}
          <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            serviceFlow === "urgency_check" 
              ? "border-primary bg-primary/5" 
              : "hover:bg-muted/50"
          }`}>
            <RadioGroupItem value="urgency_check" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Ask if Urgent</span>
                {industryRecommended === "urgency_check" ? (
                  <Badge variant="default" className="text-xs">Recommended for your business</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Common for HVAC, plumbing, electrical</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                AI asks if it's urgent first, then schedules or expedites accordingly.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {`"Is this urgent, or can you schedule ${article} ${apptLabel}?"`}
              </p>
            </div>
          </label>

          {/* Dispatch First */}
          <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            serviceFlow === "dispatch_first" 
              ? "border-primary bg-primary/5" 
              : "hover:bg-muted/50"
          }`}>
            <RadioGroupItem value="dispatch_first" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Truck className="h-4 w-4" />
                <span className="font-medium">Immediate Dispatch</span>
                {industryRecommended === "dispatch_first" ? (
                  <Badge variant="default" className="text-xs">Recommended for your business</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Common for locksmiths, towing</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                AI treats every call as immediate dispatch, like a tow truck service.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                "What's your address? I'll send someone right away."
              </p>
            </div>
          </label>
        </RadioGroup>

        {/* Info box */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm font-medium">How it works:</p>
          {serviceFlow === "schedule_first" && (
            <p className="text-sm text-muted-foreground">
              Customer: "{exampleCustomerRequest}"<br />
              AI: "Great! When would work best for you?"
            </p>
          )}
          {serviceFlow === "urgency_check" && (
            <p className="text-sm text-muted-foreground">
              Customer: "{exampleCustomerRequest}"<br />
              AI: "Is this urgent, or would you like to schedule {article} {apptLabel}?"<br />
              <span className="text-xs">(If urgent, AI checks same-day availability or offers expedited service)</span>
            </p>
          )}
          {serviceFlow === "dispatch_first" && (
            <p className="text-sm text-muted-foreground">
              Customer: "I'm locked out"<br />
              AI: "I can send someone right away. What's your address?"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
