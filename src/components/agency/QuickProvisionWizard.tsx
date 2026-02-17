import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, Check, Building2 } from "lucide-react";
import { searchIndustries, getPopularIndustries, type IndustryCatalogEntry } from "@/data/industryCatalog";
import { toast } from "sonner";

type Step = "info" | "creating" | "done";

interface QuickProvisionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
}

export function QuickProvisionWizard({ open, onOpenChange, agencyId }: QuickProvisionWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("info");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [industryQuery, setIndustryQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCatalogEntry | null>(null);
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);

  const popularIndustries = getPopularIndustries(8);
  const searchResults = industryQuery.length >= 2 ? searchIndustries(industryQuery) : [];
  const displayIndustries = industryQuery.length >= 2 ? searchResults : popularIndustries;

  const resetWizard = () => {
    setStep("info");
    setBusinessName("");
    setTimezone("America/New_York");
    setIndustryQuery("");
    setSelectedIndustry(null);
    setCreatedTenantId(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetWizard, 300);
  };

  const handleCreate = async () => {
    if (!businessName.trim() || !user) return;

    setStep("creating");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const body: Record<string, unknown> = {
        name: businessName.trim(),
        business_mode: selectedIndustry?.businessMode || "service",
        timezone,
        agency_id: agencyId,
        industry: selectedIndustry?.slug || "general",
        enabled_modules: selectedIndustry?.enabledModules || ["ai_voice", "instant_text_back", "booking"],
      };

      const response = await supabase.functions.invoke("create-tenant", {
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create tenant");
      }

      const tenantId = response.data?.tenant_id;
      setCreatedTenantId(tenantId);

      // Invalidate agency queries
      queryClient.invalidateQueries({ queryKey: ["agency-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["agency-metrics"] });

      toast.success(`${businessName.trim()} has been created`);
      setStep("done");
    } catch (err: any) {
      toast.error(err.message || "Failed to create client");
      setStep("info");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Add New Client
          </DialogTitle>
          <DialogDescription>
            {step === "info" && "Set up a new business for your agency."}
            {step === "creating" && "Creating the account..."}
            {step === "done" && "Client account is ready!"}
          </DialogDescription>
        </DialogHeader>

        {step === "info" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Joe's Plumbing"
              />
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)}
                placeholder="Search industries..."
              />
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {displayIndustries.slice(0, 12).map((ind) => (
                  <button
                    key={ind.slug}
                    onClick={() => {
                      setSelectedIndustry(ind);
                      setIndustryQuery(ind.label);
                    }}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs transition-colors ${
                      selectedIndustry?.slug === ind.slug
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern</SelectItem>
                  <SelectItem value="America/Chicago">Central</SelectItem>
                  <SelectItem value="America/Denver">Mountain</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!businessName.trim()}>
                Create Client
              </Button>
            </div>
          </div>
        )}

        {step === "creating" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Setting up {businessName}...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">{businessName} is ready!</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              {createdTenantId && (
                <Button asChild>
                  <a href={`/app/business-brain?tenant=${createdTenantId}`}>Configure AI</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
