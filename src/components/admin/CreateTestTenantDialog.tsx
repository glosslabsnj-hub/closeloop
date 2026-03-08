import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FlaskConical, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";
import { getIndustriesByMode, getIndustryBySlug } from "@/data/industryCatalog";

interface CreateTestTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated: (tenantId: string) => void;
  defaultMode: BusinessMode;
}

const BUSINESS_MODES: { value: BusinessMode; label: string; description: string }[] = [
  { value: "service", label: "Service & Booking", description: "Plumbing, HVAC, contractors" },
  { value: "dispatch", label: "Dispatch", description: "Towing, roadside, delivery" },
  { value: "food", label: "Food & Restaurant", description: "Restaurants, cafes, catering" },
  { value: "medical", label: "Medical Intake", description: "Clinics, healthcare, patient privacy" },
  { value: "general", label: "General", description: "Callback and messaging" },
  { value: "sales", label: "Sales", description: "Dealerships, real estate, high-ticket" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
];

export function CreateTestTenantDialog({ 
  open, 
  onOpenChange, 
  onTenantCreated,
  defaultMode
}: CreateTestTenantDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [industrySlug, setIndustrySlug] = useState("");

  // Use the defaultMode prop directly - mode is determined by admin mode selector
  const businessMode = defaultMode;

  // Industries available for the current mode (for slug-specific QA testing)
  const availableIndustries = getIndustriesByMode(businessMode).slice(0, 20);

  const handleQuickCreate = async () => {
    if (!user || !businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setIsCreating(true);
    try {
      // Create tenant via edge function (handles RLS bypass and membership creation)
      const { data: createResult, error: createError } = await supabase.functions.invoke(
        "create-tenant",
        {
          body: {
            name: businessName.trim(),
            business_mode: businessMode,
            timezone,
            enabled_modules: getDefaultModules(businessMode),
            hipaa_mode: businessMode === "medical",
          },
        }
      );

      // Handle transport error
      if (createError) {
        console.error("Tenant creation transport error:", createError);
        throw new Error(createError.message || "Failed to create tenant");
      }

      // Handle application error from edge function
      if (createResult?.error) {
        console.error("Tenant creation app error:", createResult.error);
        throw new Error(createResult.error);
      }

      const tenantId = createResult.tenant_id;
      if (!tenantId) {
        throw new Error("No tenant ID returned from server");
      }

      // Create assistant_settings for the tenant (now allowed since membership exists)
      const { error: settingsError } = await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenantId,
          voice_ai_enabled: true,
          instant_text_enabled: true,
        });

      if (settingsError) {
        console.warn("Failed to create assistant_settings:", settingsError);
      }

      // Set industry slug + seed catalog services/FAQs when an industry is selected
      if (industrySlug) {
        const catalogEntry = getIndustryBySlug(industrySlug);
        if (catalogEntry) {
          // Write industry slug to tenants table
          await supabase.from("tenants").update({ industry: industrySlug }).eq("id", tenantId);

          // Seed services from catalog
          if (catalogEntry.services?.length > 0) {
            const servicesToInsert = catalogEntry.services.map((svc) => ({
              tenant_id: tenantId,
              name: svc.name,
              price_type: svc.priceType as "fixed" | "starting_at" | "quote_only",
              price_amount: svc.price > 0 ? svc.price : null,
              duration_minutes: svc.duration,
              is_active: true,
              ...(svc.bookingType ? { booking_type: svc.bookingType } : {}),
            }));
            const { error: svcErr } = await supabase.from("services").insert(servicesToInsert);
            if (svcErr) console.warn("Failed to seed services:", svcErr);
          }

          // Seed FAQs from catalog
          if (catalogEntry.faqs?.length > 0) {
            const faqsToInsert = catalogEntry.faqs.map((faq, i) => ({
              tenant_id: tenantId,
              question: faq.question,
              answer: faq.answer,
              priority_weight: i,
            }));
            const { error: faqErr } = await supabase.from("business_faqs").insert(faqsToInsert);
            if (faqErr) console.warn("Failed to seed FAQs:", faqErr);
          }

          // Seed objections from catalog
          if (catalogEntry.objections?.length > 0) {
            const objectionsToInsert = catalogEntry.objections.map((obj, i) => ({
              tenant_id: tenantId,
              objection: obj.objection,
              response: obj.response,
              priority_weight: i,
            }));
            const { error: objErr } = await supabase.from("objection_responses").insert(objectionsToInsert);
            if (objErr) console.warn("Failed to seed objections:", objErr);
          }
        }
      }

      toast.success(`Created test tenant: ${businessName}${industrySlug ? ` (${industrySlug})` : ""}`);
      onTenantCreated(tenantId);

      // Reset form
      setBusinessName("");
      setTimezone("America/New_York");
      setIndustrySlug("");
    } catch (error: any) {
      console.error("Failed to create test tenant:", error);
      toast.error(error.message || "Failed to create tenant");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFullOnboarding = () => {
    // Navigate to the admin test onboarding page
    onOpenChange(false);
    navigate(`/admin/test-onboarding?mode=${businessMode}`);
  };

  const getDefaultModules = (mode: BusinessMode): string[] => {
    switch (mode) {
      case "service":
        return ["ai_voice", "instant_text_back", "booking"];
      case "dispatch":
        return ["ai_voice", "instant_text_back", "dispatch_queue"];
      case "food":
        return ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations"];
      case "medical":
        return ["ai_voice", "instant_text_back", "medical_intake"];
      case "sales":
        return ["ai_voice", "instant_text_back", "sales_leads", "booking"];
      case "general":
      default:
        return ["ai_voice", "instant_text_back"];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-warning" />
            Create Test Tenant
          </DialogTitle>
          <DialogDescription>
            Create a new test tenant to test different business modes and configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              placeholder="e.g., Test Plumbing Co"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Business Mode</Label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
              <span className="font-medium">
                {BUSINESS_MODES.find(m => m.value === businessMode)?.label}
              </span>
              <span className="text-muted-foreground">
                ({BUSINESS_MODES.find(m => m.value === businessMode)?.description})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Mode is set by the current admin mode selection
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableIndustries.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="industry-slug">Industry (optional)</Label>
              <Select value={industrySlug || "_none"} onValueChange={(v) => setIndustrySlug(v === "_none" ? "" : v)}>
                <SelectTrigger id="industry-slug">
                  <SelectValue placeholder="None — generic test tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None — generic test tenant</SelectItem>
                  {availableIndustries.map((ind) => (
                    <SelectItem key={ind.slug} value={ind.slug}>
                      {ind.icon} {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {industrySlug && (
                <p className="text-xs text-muted-foreground">
                  Will seed {getIndustryBySlug(industrySlug)?.services?.length ?? 0} services and{" "}
                  {getIndustryBySlug(industrySlug)?.faqs?.length ?? 0} FAQs from the {industrySlug} catalog.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Cancel
          </Button>
          <Button 
            variant="secondary"
            onClick={handleFullOnboarding}
            disabled={isCreating}
            className="sm:flex-1"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Full Onboarding
          </Button>
          <Button 
            onClick={handleQuickCreate} 
            disabled={isCreating || !businessName.trim()}
            className="sm:flex-1"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Quick Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
