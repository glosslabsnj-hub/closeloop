import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { updateBusinessPolicies } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    <Card>
      <CardHeader>
        <CardTitle>Business Policies</CardTitle>
        <CardDescription>
          Define your cancellation, deposit, refund, and payment policies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cancellation">Cancellation Policy</Label>
          <Textarea
            id="cancellation"
            value={formData.cancellation_policy}
            onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
            placeholder="e.g., Free cancellation up to 24 hours before appointment. Cancellations within 24 hours incur a $50 fee."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deposit">Deposit Policy</Label>
          <Textarea
            id="deposit"
            value={formData.deposit_policy}
            onChange={(e) => setFormData({ ...formData, deposit_policy: e.target.value })}
            placeholder="e.g., $100 deposit required to secure booking. Deposit is non-refundable but applies toward final bill."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refund">Refund Policy</Label>
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
  );
}
