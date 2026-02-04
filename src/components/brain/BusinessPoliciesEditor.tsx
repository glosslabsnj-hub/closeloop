import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { updateBusinessPolicies } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PolicyTemplateButtons } from "./PolicyTemplateButtons";
import { PreviewSentence } from "./layout/BusinessBrainSectionCard";

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
      toast.success("Policies saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
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

  // Build preview
  const buildPreview = () => {
    const parts: string[] = [];
    if (formData.cancellation_policy) {
      parts.push(formData.cancellation_policy.split('.')[0] + '.');
    }
    if (formData.payment_methods.length > 0) {
      const methods = formData.payment_methods.map(m => 
        PAYMENT_METHODS.find(pm => pm.id === m)?.label || m
      );
      parts.push(`We accept ${methods.slice(0, 3).join(', ')}${methods.length > 3 ? ' and more' : ''}.`);
    }
    return parts.length > 0 ? parts.join(' ') : "No policies configured yet.";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSentence sentence={buildPreview()} />

      {/* Cancellation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cancellation Policy</Label>
          <PolicyTemplateButtons 
            type="cancellation" 
            onSelect={(text) => setFormData({ ...formData, cancellation_policy: text })}
          />
        </div>
        <Textarea
          value={formData.cancellation_policy}
          onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
          placeholder="Free cancellation up to 24 hours before..."
          rows={2}
        />
      </div>

      {/* Deposit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Deposit Policy</Label>
          <PolicyTemplateButtons 
            type="deposit" 
            onSelect={(text) => setFormData({ ...formData, deposit_policy: text })}
          />
        </div>
        <Textarea
          value={formData.deposit_policy}
          onChange={(e) => setFormData({ ...formData, deposit_policy: e.target.value })}
          placeholder="$100 deposit to secure booking..."
          rows={2}
        />
      </div>

      {/* Refund */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Refund Policy</Label>
          <PolicyTemplateButtons 
            type="refund" 
            onSelect={(text) => setFormData({ ...formData, refund_policy: text })}
          />
        </div>
        <Textarea
          value={formData.refund_policy}
          onChange={(e) => setFormData({ ...formData, refund_policy: e.target.value })}
          placeholder="Full refund if cancelled 48+ hours in advance..."
          rows={2}
        />
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        <Label>Accepted Payments</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.payment_methods.includes(method.id)}
                onCheckedChange={() => togglePaymentMethod(method.id)}
              />
              <span className="text-sm">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
