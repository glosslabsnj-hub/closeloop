import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LADDER_STEPS, formatPrice, type PlanSku } from "@/config/pricing";

interface AgencyPaymentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function AgencyPaymentLinkDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: AgencyPaymentLinkDialogProps) {
  const [selectedSku, setSelectedSku] = useState<PlanSku>("growth-150");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectableSteps = LADDER_STEPS.filter((s) => !s.isEnterprise);

  const handlePayNow = async () => {
    setPayNowLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan_sku: selectedSku, tenant_id: tenantId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw new Error(error.message || "Failed to create checkout session");
      if (!data?.checkout_url) throw new Error("No checkout URL returned");

      window.location.href = data.checkout_url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
      setPayNowLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLinkLoading(true);
    setPaymentLinkUrl(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: { plan_sku: selectedSku, tenant_id: tenantId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw new Error(error.message || "Failed to generate payment link");
      if (!data?.checkout_url) throw new Error("No payment link returned");

      setPaymentLinkUrl(data.checkout_url);
      toast.success("Payment link generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payment link");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!paymentLinkUrl) return;
    await navigator.clipboard.writeText(paymentLinkUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setPaymentLinkUrl(null);
      setCopied(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Activate Plan</DialogTitle>
          <DialogDescription>
            Choose a plan for {tenantName} and send a payment link or pay now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Plan</Label>
            <RadioGroup
              value={selectedSku}
              onValueChange={(v) => setSelectedSku(v as PlanSku)}
              className="space-y-2"
            >
              {selectableSteps.map((step) => (
                <div
                  key={step.sku}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                    selectedSku === step.sku
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedSku(step.sku)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={step.sku} id={`plan-${step.sku}`} />
                    <Label htmlFor={`plan-${step.sku}`} className="cursor-pointer">
                      <div className="font-medium text-sm">{step.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {step.includedMinutes?.toLocaleString()} minutes
                      </div>
                    </Label>
                  </div>
                  <span className="font-semibold text-sm">{formatPrice(step.price)}/mo</span>
                </div>
              ))}
            </RadioGroup>
          </div>

          {paymentLinkUrl && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  value={paymentLinkUrl}
                  readOnly
                  className="text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the client. It expires in 24 hours.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGenerateLink}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Generate Client Link
            </Button>
            <Button
              className="flex-1"
              onClick={handlePayNow}
              disabled={payNowLoading}
            >
              {payNowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Pay Now (Agency)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
