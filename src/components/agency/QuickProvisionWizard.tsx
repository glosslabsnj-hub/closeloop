import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Check, Building2, Copy, ExternalLink, Brain, Rocket, CreditCard } from "lucide-react";
import { searchIndustries, getPopularIndustries, type IndustryCatalogEntry } from "@/data/industryCatalog";
import { LADDER_STEPS, formatPrice, type PlanSku } from "@/config/pricing";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Step = "info" | "creating" | "done";

interface QuickProvisionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  prefillLead?: { name: string; industry?: string };
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pb-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current
              ? "w-6 bg-primary"
              : i < current
                ? "w-1.5 bg-primary/40"
                : "w-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function QuickProvisionWizard({ open, onOpenChange, agencyId, prefillLead }: QuickProvisionWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("info");
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [industryQuery, setIndustryQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCatalogEntry | null>(null);
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [selectedPlanSku, setSelectedPlanSku] = useState<PlanSku>("growth-150");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const popularIndustries = getPopularIndustries(8);
  const searchResults = industryQuery.length >= 2 ? searchIndustries(industryQuery) : [];
  const displayIndustries = industryQuery.length >= 2 ? searchResults : popularIndustries;

  const stepIndex = step === "info" ? 0 : step === "creating" ? 1 : 2;

  // Pre-fill from lead data
  useEffect(() => {
    if (prefillLead && open) {
      setBusinessName(prefillLead.name);
      if (prefillLead.industry) {
        setIndustryQuery(prefillLead.industry);
        const match = searchIndustries(prefillLead.industry)[0];
        if (match) setSelectedIndustry(match);
      }
    }
  }, [prefillLead, open]);

  const resetWizard = () => {
    setStep("info");
    setBusinessName("");
    setBusinessPhone("");
    setOwnerEmail("");
    setTimezone("America/New_York");
    setIndustryQuery("");
    setSelectedIndustry(null);
    setCreatedTenantId(null);
    setSelectedPlanSku("growth-150");
    setPaymentLinkUrl(null);
    setLinkLoading(false);
    setLinkCopied(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetWizard, 300);
  };

  const handleCreate = async () => {
    if (!businessName.trim() || !user) return;

    // Basic email validation if provided
    if (ownerEmail.trim() && !ownerEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

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
        owner_email: ownerEmail.trim() || undefined,
        phone: businessPhone.trim() || undefined,
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

        <StepIndicator current={stepIndex} total={3} />

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
              <Label>Business Phone</Label>
              <Input
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="(555) 123-4567"
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
                      setIndustryQuery(ind.name);
                    }}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs transition-colors ${
                      selectedIndustry?.slug === ind.slug
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {ind.name}
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

            <div className="space-y-2">
              <Label>Business Owner Email (optional)</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@business.com"
              />
              <p className="text-xs text-muted-foreground">
                If provided, the business owner will be invited as the account owner. Otherwise, you'll manage it directly.
              </p>
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
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{businessName} is ready!</p>
                {ownerEmail && (
                  <p className="text-xs text-muted-foreground">Invitation sent to {ownerEmail}</p>
                )}
              </div>
            </div>

            {/* Onboarding Checklist */}
            {createdTenantId && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Steps</p>
                <div className="space-y-1.5">
                  <Link
                    to={`/app/business-brain?tenant=${createdTenantId}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Configure Business Brain</span>
                  </Link>
                  <Link
                    to={`/app/go-live?tenant=${createdTenantId}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Check AI Readiness</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Plan Selection */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select a Plan</p>
              <RadioGroup
                value={selectedPlanSku}
                onValueChange={(v) => setSelectedPlanSku(v as PlanSku)}
                className="space-y-1.5"
              >
                {LADDER_STEPS.filter((s) => !s.isEnterprise).map((step) => (
                  <div
                    key={step.sku}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-sm ${
                      selectedPlanSku === step.sku
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPlanSku(step.sku)}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={step.sku} id={`wiz-${step.sku}`} />
                      <Label htmlFor={`wiz-${step.sku}`} className="cursor-pointer text-sm">
                        {step.shortName}
                      </Label>
                    </div>
                    <span className="font-semibold text-sm">{formatPrice(step.price)}/mo</span>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Payment Link URL (shown after generation) */}
            {paymentLinkUrl && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium">Payment Link</p>
                <div className="flex gap-2">
                  <Input value={paymentLinkUrl} readOnly className="text-xs h-8" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={async () => {
                      await navigator.clipboard.writeText(paymentLinkUrl);
                      setLinkCopied(true);
                      toast.success("Link copied");
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                  >
                    {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Share with client. Expires in 24h.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={linkLoading || !createdTenantId}
                onClick={async () => {
                  if (!createdTenantId) return;
                  setLinkLoading(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    const { data, error } = await supabase.functions.invoke("create-payment-link", {
                      body: { plan_sku: selectedPlanSku, tenant_id: createdTenantId },
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    if (error) throw new Error(error.message);
                    if (!data?.checkout_url) throw new Error("No link returned");
                    setPaymentLinkUrl(data.checkout_url);
                    toast.success("Payment link generated");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to generate link");
                  } finally {
                    setLinkLoading(false);
                  }
                }}
              >
                {linkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                Send Payment Link
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!createdTenantId}
                onClick={async () => {
                  if (!createdTenantId) return;
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
                      body: { plan_sku: selectedPlanSku, tenant_id: createdTenantId },
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    if (error) throw new Error(error.message);
                    if (!data?.checkout_url) throw new Error("No checkout URL");
                    window.location.href = data.checkout_url;
                  } catch (err: any) {
                    toast.error(err.message || "Failed to start checkout");
                  }
                }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Pay Now
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
