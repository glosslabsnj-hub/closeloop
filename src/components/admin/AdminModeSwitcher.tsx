import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Briefcase, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope, 
  Building2,
  ChevronDown,
  FlaskConical,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";
import { INDUSTRY_TEST_DATA, TEST_PHONES } from "@/data/industryTestData";

interface ModeConfig {
  label: string;
  icon: React.ElementType;
  modules: string[];
  hipaa: boolean;
}

const BUSINESS_MODES: Record<BusinessMode, ModeConfig> = {
  service: {
    label: "Service & Booking",
    icon: Briefcase,
    modules: ["ai_voice", "booking", "payments"],
    hipaa: false,
  },
  dispatch: {
    label: "Dispatch",
    icon: Truck,
    modules: ["ai_voice", "dispatch_queue", "gps_tracking"],
    hipaa: false,
  },
  food: {
    label: "Food & Restaurant",
    icon: UtensilsCrossed,
    modules: ["ai_voice", "food_orders", "menu_knowledge", "reservations", "catering"],
    hipaa: false,
  },
  medical: {
    label: "Medical Intake",
    icon: Stethoscope,
    modules: ["ai_voice", "medical_intake", "hipaa_logging"],
    hipaa: true,
  },
  general: {
    label: "General",
    icon: Building2,
    modules: ["ai_voice"],
    hipaa: false,
  },
};

async function resetAllTestData(tenantId: string, mode: BusinessMode) {
  const testData = INDUSTRY_TEST_DATA[mode];
  const config = BUSINESS_MODES[mode];
  
  // 1. Update tenant name, mode, and modules
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({
      name: testData.tenantName,
      business_mode: mode,
      enabled_modules: config.modules,
      hipaa_mode: config.hipaa,
    })
    .eq("id", tenantId);
  
  if (tenantError) throw tenantError;

  // 2. Replace services
  await supabase.from("services").delete().eq("tenant_id", tenantId);
  if (testData.services.length > 0) {
    const { error: servicesError } = await supabase
      .from("services")
      .insert(testData.services.map(s => ({
        tenant_id: tenantId,
        name: s.name,
        description: s.description,
        duration_minutes: s.duration_minutes,
        price_amount: s.price_amount,
        price_type: s.price_type,
        is_active: true,
      })));
    if (servicesError) console.error("Services insert error:", servicesError);
  }

  // 3. Replace FAQs
  await supabase.from("business_faqs").delete().eq("tenant_id", tenantId);
  if (testData.faqs.length > 0) {
    const { error: faqsError } = await supabase
      .from("business_faqs")
      .insert(testData.faqs.map((f, i) => ({
        tenant_id: tenantId,
        question: f.question,
        answer: f.answer,
        priority_weight: testData.faqs.length - i,
      })));
    if (faqsError) console.error("FAQs insert error:", faqsError);
  }

  // 4. Replace knowledge base policies
  await supabase.from("ai_knowledge_base").delete().eq("tenant_id", tenantId);
  if (testData.policies.length > 0) {
    const { error: policiesError } = await supabase
      .from("ai_knowledge_base")
      .insert(testData.policies.map((p, i) => ({
        tenant_id: tenantId,
        title: p.title,
        content: p.content,
        type: p.type,
        priority_weight: testData.policies.length - i,
      })));
    if (policiesError) console.error("Policies insert error:", policiesError);
  }

  // 5. Replace objection responses
  await supabase.from("objection_responses").delete().eq("tenant_id", tenantId);
  if (testData.objections.length > 0) {
    const { error: objectionsError } = await supabase
      .from("objection_responses")
      .insert(testData.objections.map((o, i) => ({
        tenant_id: tenantId,
        objection: o.objection,
        response: o.response,
        priority_weight: testData.objections.length - i,
      })));
    if (objectionsError) console.error("Objections insert error:", objectionsError);
  }

  // 6. Replace availability hours
  await supabase.from("availability_slots").delete().eq("tenant_id", tenantId);
  if (testData.hours.length > 0) {
    const { error: hoursError } = await supabase
      .from("availability_slots")
      .insert(testData.hours.map(h => ({
        tenant_id: tenantId,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_available: h.is_available,
      })));
    if (hoursError) console.error("Hours insert error:", hoursError);
  }

  // 7. Replace call sessions
  await supabase.from("ai_call_sessions").delete().eq("tenant_id", tenantId);
  const now = new Date();
  const callRecords = testData.calls.map((data, index) => ({
    tenant_id: tenantId,
    caller_phone: TEST_PHONES[index],
    call_direction: "inbound" as const,
    started_at: new Date(now.getTime() - (index + 1) * 3600000).toISOString(),
    ended_at: new Date(now.getTime() - (index + 1) * 3600000 + 300000).toISOString(),
    outcome: data.outcome,
    summary: data.summary,
    context_json: {
      customer_name: data.customer_name,
      service_requested: data.service_requested,
      booking_confirmed: data.outcome === "booked",
      ...data.context_extra,
    },
  }));

  const { error: callsError } = await supabase
    .from("ai_call_sessions")
    .insert(callRecords);

  if (callsError) console.error("Calls insert error:", callsError);
}

export function AdminModeSwitcher() {
  const { tenant, user, refreshTenant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for the tenant's admin
  if (!tenant || !user) return null;

  const currentMode = (tenant.business_mode as BusinessMode) || "service";
  const CurrentIcon = BUSINESS_MODES[currentMode]?.icon || Briefcase;

  const handleModeChange = async (newMode: BusinessMode) => {
    if (newMode === currentMode || isLoading) return;
    
    setIsLoading(true);
    try {
      // Reset ALL test data for this mode
      await resetAllTestData(tenant.id, newMode);

      toast.success(`Switched to ${BUSINESS_MODES[newMode].label} mode`, {
        description: `Business data updated to ${INDUSTRY_TEST_DATA[newMode].tenantName}`,
      });
      
      // Refresh tenant data to update navigation and context
      await refreshTenant();
    } catch (error) {
      console.error("Failed to switch mode:", error);
      toast.error("Failed to switch business mode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm">
        <FlaskConical className="h-4 w-4 text-warning" />
        <span className="text-warning font-medium">
          Testing Mode:
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="h-7 gap-1.5 bg-background border-warning/30 hover:bg-warning/10"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CurrentIcon className="h-3.5 w-3.5" />
              )}
              {BUSINESS_MODES[currentMode]?.label || "Select Mode"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {Object.entries(BUSINESS_MODES).map(([mode, config]) => {
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode as BusinessMode)}
                  className={mode === currentMode ? "bg-accent" : ""}
                  disabled={isLoading}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <span className="text-muted-foreground text-xs hidden sm:inline">
          ({tenant.name})
        </span>
      </div>
    </div>
  );
}
