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
import { INDUSTRY_TEST_DATA, TEST_PHONES, getRelativeDate } from "@/data/industryTestData";

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

async function clearAllIndustrySpecificData(tenantId: string) {
  // Clear all industry-specific tables to avoid stale data
  await Promise.all([
    supabase.from("menu_items").delete().eq("tenant_id", tenantId),
    supabase.from("reservations").delete().eq("tenant_id", tenantId),
    supabase.from("food_orders").delete().eq("tenant_id", tenantId),
    supabase.from("catering_requests").delete().eq("tenant_id", tenantId),
    supabase.from("dispatch_jobs").delete().eq("tenant_id", tenantId),
    supabase.from("medical_intakes").delete().eq("tenant_id", tenantId),
  ]);
}

async function insertFoodModeData(tenantId: string) {
  const testData = INDUSTRY_TEST_DATA.food;
  
  // Insert menu items
  if (testData.menuItems && testData.menuItems.length > 0) {
    const menuRecords = testData.menuItems.map(item => ({
      tenant_id: tenantId,
      name: item.name,
      category: item.category,
      description: item.description,
      price_cents: item.price_cents,
      dietary_tags: item.dietary_tags,
      prep_time_minutes: item.prep_time_minutes,
      is_available: item.is_available,
    }));
    
    const { error } = await supabase.from("menu_items").insert(menuRecords);
    if (error) throw new Error(`Menu items: ${error.message}`);
  }
  
  // Insert reservations with computed dates
  if (testData.reservations && testData.reservations.length > 0) {
    const reservationRecords = testData.reservations.map(res => ({
      tenant_id: tenantId,
      customer_name: res.customer_name,
      customer_phone: res.customer_phone,
      party_size: res.party_size,
      reservation_date: getRelativeDate(res.reservation_date),
      reservation_time: res.reservation_time,
      status: res.status,
      special_requests: res.special_requests,
      table_preference: res.table_preference,
    }));
    
    const { error } = await supabase.from("reservations").insert(reservationRecords);
    if (error) throw new Error(`Reservations: ${error.message}`);
  }
  
  // Insert food orders
  if (testData.orders && testData.orders.length > 0) {
    const orderRecords = testData.orders.map(order => ({
      tenant_id: tenantId,
      order_number: order.order_number,
      order_type: order.order_type,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      items_json: order.items_json,
      subtotal_cents: order.subtotal_cents,
      tax_cents: order.tax_cents,
      total_cents: order.total_cents,
      status: order.status,
      special_instructions: order.special_instructions,
      delivery_address: order.delivery_address,
    }));
    
    const { error } = await supabase.from("food_orders").insert(orderRecords);
    if (error) throw new Error(`Food orders: ${error.message}`);
  }
  
  // Insert catering requests with computed dates
  if (testData.cateringRequests && testData.cateringRequests.length > 0) {
    const cateringRecords = testData.cateringRequests.map(req => ({
      tenant_id: tenantId,
      customer_name: req.customer_name,
      customer_phone: req.customer_phone,
      customer_email: req.customer_email,
      event_type: req.event_type,
      event_date: getRelativeDate(req.event_date),
      event_time: req.event_time,
      guest_count: req.guest_count,
      budget_range: req.budget_range,
      menu_preferences: req.menu_preferences,
      dietary_restrictions: req.dietary_restrictions,
      location: req.location,
      status: req.status,
      quote_amount_cents: req.quote_amount_cents,
      notes: req.notes,
    }));
    
    const { error } = await supabase.from("catering_requests").insert(cateringRecords);
    if (error) throw new Error(`Catering requests: ${error.message}`);
  }
}

async function insertDispatchModeData(tenantId: string) {
  const testData = INDUSTRY_TEST_DATA.dispatch;
  
  if (testData.dispatchJobs && testData.dispatchJobs.length > 0) {
    const now = new Date();
    
    const dispatchRecords = testData.dispatchJobs.map((job, index) => ({
      tenant_id: tenantId,
      job_number: job.job_number,
      job_type: job.job_type,
      priority: job.priority,
      status: job.status,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      pickup_address: job.pickup_address,
      dropoff_address: job.dropoff_address,
      description: job.description,
      assigned_crew: job.assigned_crew,
      assigned_vehicle: job.assigned_vehicle,
      estimated_duration_minutes: job.estimated_duration_minutes,
      price_cents: job.price_cents,
      notes: job.notes,
      requested_at: new Date(now.getTime() - (index + 1) * 1800000).toISOString(), // 30 min apart
      dispatched_at: job.status !== "pending" ? new Date(now.getTime() - index * 1200000).toISOString() : null,
      arrived_at: job.status === "on_site" || job.status === "completed" ? new Date(now.getTime() - index * 600000).toISOString() : null,
      completed_at: job.status === "completed" ? new Date(now.getTime() - 3600000).toISOString() : null,
    }));
    
    const { error } = await supabase.from("dispatch_jobs").insert(dispatchRecords);
    if (error) throw new Error(`Dispatch jobs: ${error.message}`);
  }
}

async function insertMedicalModeData(tenantId: string) {
  const testData = INDUSTRY_TEST_DATA.medical;
  
  if (testData.medicalIntakes && testData.medicalIntakes.length > 0) {
    const intakeRecords = testData.medicalIntakes.map(intake => ({
      tenant_id: tenantId,
      intake_type: intake.intake_type,
      urgency_level: intake.urgency_level,
      reason_for_visit: intake.reason_for_visit,
      status: intake.status,
      verbal_consent_given: intake.verbal_consent_given,
      consent_timestamp: intake.verbal_consent_given ? new Date().toISOString() : null,
      insurance_provider: intake.insurance_provider,
      preferred_date: getRelativeDate(intake.preferred_date),
      preferred_time_range: intake.preferred_time_range,
      ai_summary: intake.ai_summary,
    }));
    
    const { error } = await supabase.from("medical_intakes").insert(intakeRecords);
    if (error) throw new Error(`Medical intakes: ${error.message}`);
  }
}

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

  // 2. Clear ALL industry-specific tables first
  await clearAllIndustrySpecificData(tenantId);

  // 3. Replace common tables (services, FAQs, knowledge base, etc.)
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
    if (servicesError) throw new Error(`Services: ${servicesError.message}`);
  }

  // 4. Replace FAQs
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
    if (faqsError) throw new Error(`FAQs: ${faqsError.message}`);
  }

  // 5. Replace knowledge base policies
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
    if (policiesError) throw new Error(`Policies: ${policiesError.message}`);
  }

  // 6. Replace objection responses
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
    if (objectionsError) throw new Error(`Objections: ${objectionsError.message}`);
  }

  // 7. Replace availability hours
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
    if (hoursError) throw new Error(`Hours: ${hoursError.message}`);
  }

  // 8. Replace call sessions
  await supabase.from("ai_call_sessions").delete().eq("tenant_id", tenantId);
  const now = new Date();
  const callRecords = testData.calls.map((data, index) => ({
    tenant_id: tenantId,
    caller_phone: TEST_PHONES[index % TEST_PHONES.length],
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

  if (callsError) throw new Error(`Calls: ${callsError.message}`);

  // 9. Insert industry-specific data based on mode
  if (mode === "food") {
    await insertFoodModeData(tenantId);
  } else if (mode === "dispatch") {
    await insertDispatchModeData(tenantId);
  } else if (mode === "medical") {
    await insertMedicalModeData(tenantId);
  }
}

export function AdminModeSwitcher() {
  const { tenant, user, isSuperAdmin, refreshTenant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // P0-1: Only show for super_admin users - this component injects test data
  // and should NEVER be visible to regular tenants in production
  if (!tenant || !user || !isSuperAdmin) return null;

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
