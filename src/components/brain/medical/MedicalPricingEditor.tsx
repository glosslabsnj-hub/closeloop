/**
 * Medical Pricing Editor
 * 
 * Comprehensive pricing for medical practices:
 * - Insurance accepted
 * - Self-pay/cash rates
 * - Consultation fees (new vs returning)
 * - Series/package discounts
 * - Telehealth pricing
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Info,
  Lightbulb,
  CreditCard,
  ShieldCheck,
  Users,
  Stethoscope,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface MedicalPracticeSettings {
  tenant_id: string;
  accepts_insurance: boolean;
  accepted_insurance_carriers: string[];
  insurance_notes: string | null;
  new_patient_fee_cents: number | null;
  follow_up_fee_cents: number | null;
  consultation_fee_cents: number | null;
  waive_consultation_with_treatment: boolean;
  series_discount_percent: number | null;
  requires_consent_form: boolean;
  requires_medical_history: boolean;
}

const COMMON_INSURANCE_CARRIERS = [
  "Aetna",
  "Anthem Blue Cross",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "UnitedHealthcare",
  "Tricare",
];

const defaultSettings: Partial<MedicalPracticeSettings> = {
  accepts_insurance: true,
  accepted_insurance_carriers: [],
  new_patient_fee_cents: 15000,
  follow_up_fee_cents: 7500,
  consultation_fee_cents: 5000,
  waive_consultation_with_treatment: true,
  series_discount_percent: 15,
  requires_consent_form: true,
  requires_medical_history: true,
};

export function MedicalPricingEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("insurance");
  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<MedicalPracticeSettings>>({});
  const [newCarrier, setNewCarrier] = useState("");

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["medical-practice-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("medical_practice_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as MedicalPracticeSettings | null;
    },
    enabled: !!tenant?.id,
  });

  // Merge fetched with local edits
  const effectiveSettings = useMemo(() => ({
    ...defaultSettings,
    ...settings,
    ...localSettings,
  }), [settings, localSettings]);

  const updateSetting = <K extends keyof MedicalPracticeSettings>(key: K, value: MedicalPracticeSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const addCarrier = (carrier: string) => {
    if (!carrier.trim()) return;
    const current = effectiveSettings.accepted_insurance_carriers || [];
    if (!current.includes(carrier.trim())) {
      updateSetting("accepted_insurance_carriers", [...current, carrier.trim()]);
    }
    setNewCarrier("");
  };

  const removeCarrier = (carrier: string) => {
    const current = effectiveSettings.accepted_insurance_carriers || [];
    updateSetting("accepted_insurance_carriers", current.filter(c => c !== carrier));
  };

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        ...effectiveSettings,
      };

      const { error } = await supabase
        .from("medical_practice_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;

      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["medical-practice-settings"] });
      setLocalSettings({});
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  // AI Preview
  const aiPreview = useMemo(() => {
    const parts: string[] = [];

    if (effectiveSettings.accepts_insurance) {
      const carriers = effectiveSettings.accepted_insurance_carriers || [];
      if (carriers.length > 0) {
        parts.push(`We accept ${carriers.slice(0, 3).join(", ")}${carriers.length > 3 ? ` and ${carriers.length - 3} more` : ""}`);
      } else {
        parts.push("We accept most major insurance");
      }
    } else {
      parts.push("We're a self-pay practice");
    }

    if (effectiveSettings.new_patient_fee_cents) {
      parts.push(`A new patient visit is $${(effectiveSettings.new_patient_fee_cents / 100).toFixed(0)}`);
    }

    if (effectiveSettings.waive_consultation_with_treatment) {
      parts.push("and we waive the consultation fee if you proceed with treatment");
    }

    return parts.join(". ") + ".";
  }, [effectiveSettings]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Configure your practice's pricing and insurance information. 
              Your AI will use this to answer cost questions and explain payment options to patients.
            </p>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Stethoscope className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary mb-1">What the AI tells patients</p>
            <p className="text-sm italic">"{aiPreview}"</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 h-auto">
          <TabsTrigger value="insurance" className="text-xs py-2">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs py-2">
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="requirements" className="text-xs py-2">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Requirements
          </TabsTrigger>
        </TabsList>

        {/* Insurance Settings */}
        <TabsContent value="insurance" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Accept Insurance</h4>
                  <p className="text-sm text-muted-foreground">Do you bill insurance carriers?</p>
                </div>
                <Switch
                  checked={effectiveSettings.accepts_insurance}
                  onCheckedChange={(v) => updateSetting("accepts_insurance", v)}
                />
              </div>

              {effectiveSettings.accepts_insurance && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm">Accepted Carriers</Label>
                    <div className="flex flex-wrap gap-2">
                      {(effectiveSettings.accepted_insurance_carriers || []).map(carrier => (
                        <Badge key={carrier} variant="secondary" className="gap-1 pr-1">
                          {carrier}
                          <button
                            onClick={() => removeCarrier(carrier)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Quick Add Common Carriers</Label>
                    <div className="flex flex-wrap gap-1">
                      {COMMON_INSURANCE_CARRIERS
                        .filter(c => !(effectiveSettings.accepted_insurance_carriers || []).includes(c))
                        .map(carrier => (
                          <Button
                            key={carrier}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => addCarrier(carrier)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {carrier}
                          </Button>
                        ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newCarrier}
                      onChange={(e) => setNewCarrier(e.target.value)}
                      placeholder="Add custom carrier..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCarrier(newCarrier);
                        }
                      }}
                    />
                    <Button onClick={() => addCarrier(newCarrier)} disabled={!newCarrier.trim()}>
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Insurance Notes</Label>
                    <Textarea
                      value={effectiveSettings.insurance_notes || ""}
                      onChange={(e) => updateSetting("insurance_notes", e.target.value || null)}
                      placeholder="Any special notes about insurance (e.g., 'We verify benefits before your visit')"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Settings */}
        <TabsContent value="pricing" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Self-Pay / Cash Rates</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">New Patient Visit</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={(effectiveSettings.new_patient_fee_cents || 0) / 100}
                      onChange={(e) => updateSetting("new_patient_fee_cents", Math.round(parseFloat(e.target.value) * 100) || null)}
                      className="w-28"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Follow-Up Visit</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={(effectiveSettings.follow_up_fee_cents || 0) / 100}
                      onChange={(e) => updateSetting("follow_up_fee_cents", Math.round(parseFloat(e.target.value) * 100) || null)}
                      className="w-28"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Consultation Fee</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={(effectiveSettings.consultation_fee_cents || 0) / 100}
                      onChange={(e) => updateSetting("consultation_fee_cents", Math.round(parseFloat(e.target.value) * 100) || null)}
                      className="w-28"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-sm">Waive Consultation with Treatment</Label>
                  <p className="text-xs text-muted-foreground">
                    Apply consultation fee toward treatment if patient proceeds
                  </p>
                </div>
                <Switch
                  checked={effectiveSettings.waive_consultation_with_treatment}
                  onCheckedChange={(v) => updateSetting("waive_consultation_with_treatment", v)}
                />
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label className="text-sm">Series/Package Discount</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={effectiveSettings.series_discount_percent || 0}
                    onChange={(e) => updateSetting("series_discount_percent", parseInt(e.target.value) || null)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">% off for treatment packages</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Discount applied when patients purchase a series of treatments
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  These are self-pay rates. Insurance rates are typically negotiated separately. 
                  The AI will mention these to uninsured patients or when asked about costs.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Settings */}
        <TabsContent value="requirements" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Patient Requirements</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Consent Form Required</p>
                    <p className="text-xs text-muted-foreground">
                      Patients must sign consent before treatment
                    </p>
                  </div>
                  <Switch
                    checked={effectiveSettings.requires_consent_form}
                    onCheckedChange={(v) => updateSetting("requires_consent_form", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Medical History Required</p>
                    <p className="text-xs text-muted-foreground">
                      New patients must complete health history
                    </p>
                  </div>
                  <Switch
                    checked={effectiveSettings.requires_medical_history}
                    onCheckedChange={(v) => updateSetting("requires_medical_history", v)}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  The AI will inform new patients about these requirements when they book 
                  and remind them to arrive early to complete paperwork.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
