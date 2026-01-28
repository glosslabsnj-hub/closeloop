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
  FlaskConical
} from "lucide-react";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";

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

// Test phone numbers that stay constant across mode switches
const TEST_PHONES = [
  "+15551234567",
  "+15559876543",
  "+15552223333",
  "+15554445555",
];

// Industry-specific test data for each phone number
const TEST_DATA_BY_MODE: Record<BusinessMode, Array<{
  customer_name: string;
  service_requested: string;
  summary: string;
  outcome: "booked" | "followup" | "lost" | "escalated";
  context_extra?: Record<string, unknown>;
}>> = {
  service: [
    { customer_name: "Marcus Johnson", service_requested: "Full Interior Detail", summary: "Customer booked a full interior detail for their 2022 Tesla Model 3. Scheduled for Saturday morning.", outcome: "booked", context_extra: { vehicle: "2022 Tesla Model 3", preferred_date: "Saturday" } },
    { customer_name: "Sarah Chen", service_requested: "Ceramic Coating", summary: "Caller asked about ceramic coating prices and package options. Wants to think about it and call back.", outcome: "followup", context_extra: { inquiry_type: "pricing" } },
    { customer_name: "Mike Thompson", service_requested: "Express Wash", summary: "Customer was looking for same-day service which was not available. Did not want to schedule ahead.", outcome: "lost" },
    { customer_name: "David Park", service_requested: "Fleet Detailing - 3 vehicles", summary: "Fleet account inquiry turned into booking for 3 vehicles. Corporate client from downtown law firm.", outcome: "booked", context_extra: { company: "Park & Associates Law" } },
  ],
  dispatch: [
    { customer_name: "Jennifer Walsh", service_requested: "Emergency Tire Change", summary: "Emergency roadside assistance dispatched. Customer stranded on Highway 101 with flat tire.", outcome: "booked", context_extra: { location: "Highway 101 Mile Marker 42", urgency: "high" } },
    { customer_name: "Robert Kim", service_requested: "Scheduled Tow", summary: "Scheduled tow for non-running vehicle. Customer needs car towed to mechanic tomorrow morning.", outcome: "booked", context_extra: { pickup_address: "123 Oak Street", dropoff: "Joes Auto Repair" } },
    { customer_name: "Mike Thompson", service_requested: "Motorcycle Tow", summary: "Caller needed motorcycle towing which we do not offer. Referred to specialty service.", outcome: "lost" },
    { customer_name: "Linda Garcia", service_requested: "Jump Start", summary: "Jump start service requested. Vehicle at grocery store parking lot with dead battery.", outcome: "booked", context_extra: { location: "Safeway Parking Lot - Main St", vehicle: "Honda Civic" } },
  ],
  food: [
    { customer_name: "Thomas Anderson", service_requested: "Reservation - 6 guests", summary: "Table reservation for 6 people this Friday at 7pm. Special occasion - anniversary dinner.", outcome: "booked", context_extra: { preferred_time: "7:00 PM", special_requests: "Anniversary celebration" } },
    { customer_name: "Amanda Foster", service_requested: "Catering Quote", summary: "Catering inquiry for office event. 50 people, needs menu options and quote.", outcome: "followup", context_extra: { guest_count: 50, event_type: "Corporate Lunch" } },
    { customer_name: "Chris Martinez", service_requested: "Takeout Order", summary: "Takeout order placed: 2 pad thai, 1 green curry, spring rolls. Ready in 25 mins.", outcome: "booked", context_extra: { order_details: "2x Pad Thai, 1x Green Curry, 1x Spring Rolls" } },
    { customer_name: "Emily White", service_requested: "Dietary Inquiry", summary: "Caller wanted gluten-free options. Our menu has limited GF items. They decided to try elsewhere.", outcome: "lost", context_extra: { dietary_restriction: "Gluten-free" } },
  ],
  medical: [
    { customer_name: "Patricia Brown", service_requested: "New Patient Consultation", summary: "New patient intake completed. Scheduled initial consultation for recurring headaches.", outcome: "booked", context_extra: { reason: "Recurring headaches", insurance: "Blue Cross PPO" } },
    { customer_name: "James Wilson", service_requested: "Follow-up - Lab Results", summary: "Follow-up appointment scheduled for lab result review. Patient was seen 2 weeks ago.", outcome: "booked", context_extra: { reason: "Review blood work results" } },
    { customer_name: "Maria Rodriguez", service_requested: "Annual Physical", summary: "Insurance verification needed before scheduling. Patient has new insurance carrier.", outcome: "followup", context_extra: { insurance: "Aetna - needs verification" } },
    { customer_name: "Steven Lee", service_requested: "Urgent Consultation", summary: "Urgent symptoms described. Transferred to nurse line for immediate assessment.", outcome: "escalated", context_extra: { reason: "Chest pain and shortness of breath", urgency: "high" } },
  ],
  general: [
    { customer_name: "Alex Rivera", service_requested: "General Inquiry", summary: "Caller asked about business hours and services offered. Sent follow-up email with brochure.", outcome: "followup" },
    { customer_name: "Jordan Blake", service_requested: "Pricing Information", summary: "Requested pricing for multiple services. Scheduled callback for detailed quote.", outcome: "booked" },
    { customer_name: "Casey Morgan", service_requested: "Complaint", summary: "Customer had concerns about previous service. Issue resolved, scheduled follow-up.", outcome: "followup" },
    { customer_name: "Taylor Reed", service_requested: "Partnership Inquiry", summary: "Business partnership inquiry. Not a good fit for our services at this time.", outcome: "lost" },
  ],
};

async function updateTestData(tenantId: string, mode: BusinessMode) {
  const testData = TEST_DATA_BY_MODE[mode];
  
  // Delete existing test calls for this tenant
  await supabase
    .from("ai_call_sessions")
    .delete()
    .eq("tenant_id", tenantId);
  
  // Insert new test data with the same phone numbers
  const now = new Date();
  const records = testData.map((data, index) => ({
    tenant_id: tenantId,
    caller_phone: TEST_PHONES[index],
    call_direction: "inbound" as const,
    started_at: new Date(now.getTime() - (index + 1) * 3600000).toISOString(), // 1hr, 2hr, 3hr, 4hr ago
    ended_at: new Date(now.getTime() - (index + 1) * 3600000 + 300000).toISOString(), // 5 min call
    outcome: data.outcome,
    summary: data.summary,
    context_json: {
      customer_name: data.customer_name,
      service_requested: data.service_requested,
      booking_confirmed: data.outcome === "booked",
      ...data.context_extra,
    },
  }));

  const { error } = await supabase
    .from("ai_call_sessions")
    .insert(records);

  if (error) {
    console.error("Failed to insert test data:", error);
    throw error;
  }
}

export function AdminModeSwitcher() {
  const { tenant, user, refreshTenant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for the tenant's admin
  if (!tenant || !user) return null;

  const currentMode = (tenant.business_mode as BusinessMode) || "service";
  const CurrentIcon = BUSINESS_MODES[currentMode]?.icon || Briefcase;

  const handleModeChange = async (newMode: BusinessMode) => {
    if (newMode === currentMode) return;
    
    setIsLoading(true);
    try {
      const config = BUSINESS_MODES[newMode];
      
      // Update tenant config
      const { error } = await supabase
        .from("tenants")
        .update({
          business_mode: newMode,
          enabled_modules: config.modules,
          hipaa_mode: config.hipaa,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      // Update test call data for this mode
      await updateTestData(tenant.id, newMode);

      toast.success(`Switched to ${config.label} mode`);
      
      // Refresh tenant data to update navigation and context (no full reload)
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
              <CurrentIcon className="h-3.5 w-3.5" />
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
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
