import { useState } from "react";
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
import { Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";

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
  { value: "medical", label: "Medical Intake", description: "Clinics, healthcare (HIPAA)" },
  { value: "general", label: "General", description: "Callback and messaging" },
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
  const [isCreating, setIsCreating] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  
  // Use the defaultMode prop directly - mode is determined by admin mode selector
  const businessMode = defaultMode;

  const handleCreate = async () => {
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

      toast.success(`Created test tenant: ${businessName}`);
      onTenantCreated(tenantId);

      // Reset form
      setBusinessName("");
      setTimezone("America/New_York");
    } catch (error: any) {
      console.error("Failed to create test tenant:", error);
      toast.error(error.message || "Failed to create tenant");
    } finally {
      setIsCreating(false);
    }
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
      case "general":
      default:
        return ["ai_voice", "instant_text_back"];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !businessName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Tenant"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
