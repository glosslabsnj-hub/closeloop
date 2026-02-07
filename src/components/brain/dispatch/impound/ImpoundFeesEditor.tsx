/**
 * ImpoundFeesEditor - Configure impound fee structure
 * 
 * Allows dispatch businesses to set up their fee schedule:
 * - Base tow fee
 * - Daily storage fee
 * - Admin and gate fees
 * - Accepted payment methods
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, DollarSign, CreditCard, Sparkles } from "lucide-react";

interface ImpoundSettings {
  tenant_id: string;
  base_tow_fee_cents: number;
  daily_storage_cents: number;
  gate_fee_cents: number;
  admin_fee_cents: number;
  accepted_payment: string[];
  default_release_requirements: string[];
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit Card" },
  { id: "debit_card", label: "Debit Card" },
  { id: "check", label: "Check" },
  { id: "money_order", label: "Money Order" },
];

const DEFAULT_SETTINGS: Omit<ImpoundSettings, "tenant_id"> = {
  base_tow_fee_cents: 15000,
  daily_storage_cents: 3500,
  gate_fee_cents: 5000,
  admin_fee_cents: 2500,
  accepted_payment: ["cash", "credit_card", "debit_card"],
  default_release_requirements: ["valid_id", "registration", "payment"],
};

export function ImpoundFeesEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ImpoundSettings | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
    }
  }, [tenant?.id]);

  const loadSettings = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("impound_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          tenant_id: data.tenant_id,
          base_tow_fee_cents: data.base_tow_fee_cents,
          daily_storage_cents: data.daily_storage_cents,
          gate_fee_cents: data.gate_fee_cents || 0,
          admin_fee_cents: data.admin_fee_cents || 0,
          accepted_payment: data.accepted_payment || DEFAULT_SETTINGS.accepted_payment,
          default_release_requirements: data.default_release_requirements || DEFAULT_SETTINGS.default_release_requirements,
        });
      } else {
        // Initialize with defaults
        setSettings({
          tenant_id: tenant.id,
          ...DEFAULT_SETTINGS,
        });
      }
    } catch (error) {
      console.error("Failed to load impound settings:", error);
      toast.error("Failed to load fee settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenant?.id || !settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("impound_settings")
        .upsert({
          tenant_id: tenant.id,
          base_tow_fee_cents: settings.base_tow_fee_cents,
          daily_storage_cents: settings.daily_storage_cents,
          gate_fee_cents: settings.gate_fee_cents,
          admin_fee_cents: settings.admin_fee_cents,
          accepted_payment: settings.accepted_payment,
          default_release_requirements: settings.default_release_requirements,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });

      if (error) throw error;
      toast.success("Fee settings saved");
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateCents = (field: keyof ImpoundSettings, dollars: string) => {
    if (!settings) return;
    const cents = Math.round(parseFloat(dollars || "0") * 100);
    setSettings({ ...settings, [field]: cents });
  };

  const togglePaymentMethod = (methodId: string) => {
    if (!settings) return;
    const current = settings.accepted_payment;
    const updated = current.includes(methodId)
      ? current.filter((m) => m !== methodId)
      : [...current, methodId];
    setSettings({ ...settings, accepted_payment: updated });
  };

  const formatDollars = (cents: number) => (cents / 100).toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  // Calculate example total
  const exampleDays = 3;
  const exampleTotal =
    settings.base_tow_fee_cents +
    exampleDays * settings.daily_storage_cents +
    settings.admin_fee_cents +
    settings.gate_fee_cents;

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary mb-1">What the AI tells customers (example with {exampleDays} days storage)</p>
            <p className="text-sm italic">
              "The total to release your vehicle is ${formatDollars(exampleTotal)}. 
              That's ${formatDollars(settings.base_tow_fee_cents)} for the tow, 
              ${formatDollars(exampleDays * settings.daily_storage_cents)} for {exampleDays} days of storage, 
              plus ${formatDollars(settings.admin_fee_cents + settings.gate_fee_cents)} in fees. 
              We accept {settings.accepted_payment.map(m => 
                PAYMENT_METHODS.find(p => p.id === m)?.label.toLowerCase()
              ).filter(Boolean).join(", ")}."
            </p>
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Fee Structure</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The AI calculates total release costs automatically based on days stored. Set your standard fees below.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Tow Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatDollars(settings.base_tow_fee_cents)}
                  onChange={(e) => updateCents("base_tow_fee_cents", e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Charged once when vehicle is impounded</p>
            </div>

            <div className="space-y-2">
              <Label>Daily Storage Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatDollars(settings.daily_storage_cents)}
                  onChange={(e) => updateCents("daily_storage_cents", e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Per day the vehicle stays in your lot</p>
            </div>

            <div className="space-y-2">
              <Label>Admin/Processing Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatDollars(settings.admin_fee_cents)}
                  onChange={(e) => updateCents("admin_fee_cents", e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">One-time paperwork/processing fee</p>
            </div>

            <div className="space-y-2">
              <Label>Gate Fee (After-Hours)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatDollars(settings.gate_fee_cents)}
                  onChange={(e) => updateCents("gate_fee_cents", e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Extra fee for pickups outside normal hours</p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-muted/30 p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Example calculation:</strong> $150 tow + ($35/day × 3 days) + $25 admin + $50 gate = <strong>${formatDollars(settings.base_tow_fee_cents + 3*settings.daily_storage_cents + settings.admin_fee_cents + settings.gate_fee_cents)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Accepted Payment Methods</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The AI will tell callers which payment types you accept for vehicle release.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.accepted_payment.includes(method.id) 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={settings.accepted_payment.includes(method.id)}
                  onCheckedChange={() => togglePaymentMethod(method.id)}
                />
                <span className="text-sm">{method.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Fee Settings
        </Button>
      </div>
    </div>
  );
}
