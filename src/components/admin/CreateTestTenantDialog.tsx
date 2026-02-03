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
  onTenantCreated 
}: CreateTestTenantDialogProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessMode, setBusinessMode] = useState<BusinessMode>("service");
  const [timezone, setTimezone] = useState("America/New_York");

  const handleCreate = async () => {
    if (!user || !businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setIsCreating(true);
    try {
      // Get current session for auth token
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("No active session. Please sign in again.");
      }

      // Create tenant via Edge Function (bypasses RLS, creates tenant + membership atomically)
      const createTenantResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            name: businessName.trim(),
            business_mode: businessMode,
            timezone,
            enabled_modules: getDefaultModules(businessMode),
            hipaa_mode: businessMode === "medical",
          }),
        }
      );

      if (!createTenantResponse.ok) {
        const errorData = await createTenantResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create tenant");
      }

      const { tenant_id: tenantId } = await createTenantResponse.json();
      if (!tenantId) {
        throw new Error("No tenant ID returned from server");
      }

      // Create assistant_settings for the tenant (use service client via RLS)
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
      setBusinessMode("service");
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
            <Label htmlFor="business-mode">Business Mode</Label>
            <Select value={businessMode} onValueChange={(v) => setBusinessMode(v as BusinessMode)}>
              <SelectTrigger id="business-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex flex-col">
                      <span>{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
