import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, FileText, Info, Lightbulb } from "lucide-react";
import { updateBusinessPolicies } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PolicyTemplateButtons } from "./PolicyTemplateButtons";
import { AIPreviewCard } from "./AIPreviewCard";
import { InlineUploadButton } from "./InlineUploadButton";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit Card" },
  { id: "debit_card", label: "Debit Card" },
  { id: "check", label: "Check" },
  { id: "venmo", label: "Venmo" },
  { id: "paypal", label: "PayPal" },
  { id: "zelle", label: "Zelle" },
];

export function BusinessPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    cancellation_policy: "",
    deposit_policy: "",
    refund_policy: "",
    payment_methods: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      setFormData({
        cancellation_policy: tenant.cancellation_policy || "",
        deposit_policy: tenant.deposit_policy || "",
        refund_policy: tenant.refund_policy || "",
        payment_methods: Array.isArray(tenant.payment_methods) ? tenant.payment_methods : [],
      });
      setIsLoading(false);
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      await updateBusinessPolicies(tenant.id, {
        cancellation_policy: formData.cancellation_policy.trim() || undefined,
        deposit_policy: formData.deposit_policy.trim() || undefined,
        refund_policy: formData.refund_policy.trim() || undefined,
        payment_methods: formData.payment_methods.length > 0 ? formData.payment_methods : undefined,
      });

      toast.success("Business policies updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update business policies");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(methodId)
        ? prev.payment_methods.filter((m) => m !== methodId)
        : [...prev.payment_methods, methodId],
    }));
  };

  // Build AI preview from policies
  const buildPolicyPreview = () => {
    const parts: string[] = [];
    
    if (formData.cancellation_policy) {
      // Extract the first sentence for preview
      const firstSentence = formData.cancellation_policy.split('.')[0] + '.';
      parts.push(firstSentence);
    } else {
      parts.push("Our cancellation policy is flexible.");
    }

    if (formData.payment_methods.length > 0) {
      const methods = formData.payment_methods.map(m => 
        PAYMENT_METHODS.find(pm => pm.id === m)?.label || m
      );
      if (methods.length === 1) {
        parts.push(`We accept ${methods[0]}.`);
      } else {
        const last = methods.pop();
        parts.push(`We accept ${methods.join(', ')} and ${last}.`);
      }
    }

    return parts.join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading policies...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What are policies?</p>
            <p className="text-sm text-muted-foreground">
              Your business policies help the AI answer questions about cancellations, deposits, refunds, and payment options. 
              Customers often ask about these before booking.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Have a policies document? Upload it and we'll extract the relevant information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      <AIPreviewCard
        preview={buildPolicyPreview()}
        subtitle="This is how the AI explains your policies to customers"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Core Business Policies
              </CardTitle>
              <CardDescription>
                Define your cancellation, deposit, and refund policies — the AI will explain these to customers when relevant
              </CardDescription>
            </div>
            <InlineUploadButton 
              contentType="policies" 
              variant="compact"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cancellation Policy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="cancellation">Cancellation Policy</Label>
              <PolicyTemplateButtons 
                type="cancellation" 
                onSelect={(text) => setFormData({ ...formData, cancellation_policy: text })}
              />
            </div>
            <Textarea
              id="cancellation"
              value={formData.cancellation_policy}
              onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
              placeholder="e.g., Free cancellation up to 24 hours before appointment. Cancellations within 24 hours incur a $50 fee."
              rows={3}
            />
          </div>

          {/* Deposit Policy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="deposit">Deposit Policy</Label>
              <PolicyTemplateButtons 
                type="deposit" 
                onSelect={(text) => setFormData({ ...formData, deposit_policy: text })}
              />
            </div>
            <Textarea
              id="deposit"
              value={formData.deposit_policy}
              onChange={(e) => setFormData({ ...formData, deposit_policy: e.target.value })}
              placeholder="e.g., $100 deposit required to secure booking. Deposit is non-refundable but applies toward final bill."
              rows={3}
            />
          </div>

          {/* Refund Policy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="refund">Refund Policy</Label>
              <PolicyTemplateButtons 
                type="refund" 
                onSelect={(text) => setFormData({ ...formData, refund_policy: text })}
              />
            </div>
            <Textarea
              id="refund"
              value={formData.refund_policy}
              onChange={(e) => setFormData({ ...formData, refund_policy: e.target.value })}
              placeholder="e.g., Full refund if cancelled 48+ hours in advance. No refunds for same-day cancellations."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Accepted Payment Methods</Label>
            <p className="text-xs text-muted-foreground">
              The AI will mention these when customers ask about payment options
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={method.id}
                    checked={formData.payment_methods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                  />
                  <label
                    htmlFor={method.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {method.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Policies
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
