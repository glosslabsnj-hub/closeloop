/**
 * Dispatch Policies Editor
 * For towing, roadside assistance, emergency services
 * Handles payment, cancellation, storage, release, and liability policies
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, CreditCard, XCircle, Warehouse, Key, Shield, Siren } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface DispatchPolicies {
  id?: string;
  tenant_id: string;
  // Payment
  payment_due_at_service: boolean;
  accepted_payment_methods: string[];
  cash_only_after_hours: boolean;
  prepayment_required: boolean;
  // Cancellation
  cancel_after_dispatch_fee_cents: number;
  cancel_en_route_fee_cents: number;
  cancel_on_scene_fee_cents: number;
  // Storage
  storage_daily_rate_cents: number;
  storage_max_days: number;
  storage_grace_period_hours: number;
  storage_lien_sale_days: number;
  // Release
  release_requires_id: boolean;
  release_requires_registration: boolean;
  release_requires_title: boolean;
  release_requires_insurance: boolean;
  release_authorized_agent_allowed: boolean;
  release_police_hold_policy: string;
  // Liability
  damage_waiver_text: string;
  pre_existing_damage_policy: string;
  liability_limit_cents: number;
  insurance_requirement_text: string;
  // Keys/lockout
  lockout_attempt_limit: number;
  lockout_disclaimer: string;
  spare_key_policy: string;
  // Priority
  priority_fee_percentage: number;
  emergency_surcharge_cents: number;
}

const DEFAULT_POLICIES: Omit<DispatchPolicies, 'tenant_id'> = {
  payment_due_at_service: true,
  accepted_payment_methods: ['cash', 'card'],
  cash_only_after_hours: false,
  prepayment_required: false,
  cancel_after_dispatch_fee_cents: 5000,
  cancel_en_route_fee_cents: 7500,
  cancel_on_scene_fee_cents: 10000,
  storage_daily_rate_cents: 5000,
  storage_max_days: 30,
  storage_grace_period_hours: 24,
  storage_lien_sale_days: 45,
  release_requires_id: true,
  release_requires_registration: true,
  release_requires_title: false,
  release_requires_insurance: false,
  release_authorized_agent_allowed: true,
  release_police_hold_policy: '',
  damage_waiver_text: '',
  pre_existing_damage_policy: '',
  liability_limit_cents: 0,
  insurance_requirement_text: '',
  lockout_attempt_limit: 2,
  lockout_disclaimer: '',
  spare_key_policy: '',
  priority_fee_percentage: 0,
  emergency_surcharge_cents: 0,
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Credit/Debit Card' },
  { id: 'check', label: 'Check' },
  { id: 'venmo', label: 'Venmo' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'invoice', label: 'Invoice (approved accounts)' },
];

export function DispatchPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<DispatchPolicies | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadPolicies();
    }
  }, [tenant?.id]);

  const loadPolicies = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispatch_policies')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setFormData(data || { ...DEFAULT_POLICIES, tenant_id: tenant.id });
    } catch (err: any) {
      toast.error("Failed to load policies");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('dispatch_policies')
        .upsert({
          ...formData,
          tenant_id: tenant.id,
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast.success("Policies saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof DispatchPolicies>(field: K, value: DispatchPolicies[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const togglePaymentMethod = (method: string) => {
    const current = formData?.accepted_payment_methods || [];
    if (current.includes(method)) {
      updateField('accepted_payment_methods', current.filter(m => m !== method));
    } else {
      updateField('accepted_payment_methods', [...current, method]);
    }
  };

  const formatCents = (cents: number) => cents > 0 ? `$${(cents / 100).toFixed(0)}` : '$0';

  // Build AI preview
  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];
    
    if (formData.payment_due_at_service) {
      parts.push("Payment is due at time of service.");
    }
    if (formData.cancel_after_dispatch_fee_cents > 0) {
      parts.push(`Cancellation after dispatch incurs a ${formatCents(formData.cancel_after_dispatch_fee_cents)} fee.`);
    }
    if (formData.storage_daily_rate_cents > 0) {
      parts.push(`Storage is ${formatCents(formData.storage_daily_rate_cents)} per day.`);
    }
    
    return parts.length > 0 ? parts.join(' ') : "No specific dispatch policies configured yet.";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <AIPreviewCard 
        title="How AI explains your dispatch policies"
        preview={buildAIPreview()}
      />

      {/* Payment Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Terms
          </CardTitle>
          <CardDescription>
            When and how customers pay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Payment Due at Service</Label>
              <p className="text-xs text-muted-foreground">Collect payment when job is complete</p>
            </div>
            <Switch
              checked={formData.payment_due_at_service}
              onCheckedChange={(v) => updateField('payment_due_at_service', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Prepayment Required</Label>
              <p className="text-xs text-muted-foreground">Require payment before dispatching</p>
            </div>
            <Switch
              checked={formData.prepayment_required}
              onCheckedChange={(v) => updateField('prepayment_required', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Cash Only After Hours</Label>
              <p className="text-xs text-muted-foreground">No cards accepted for after-hours calls</p>
            </div>
            <Switch
              checked={formData.cash_only_after_hours}
              onCheckedChange={(v) => updateField('cash_only_after_hours', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Accepted Payment Methods</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.accepted_payment_methods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                  />
                  <span className="text-sm">{method.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Fees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Cancellation Fees
          </CardTitle>
          <CardDescription>
            Charges when customer cancels after dispatch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>After Dispatch</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.cancel_after_dispatch_fee_cents / 100}
                  onChange={(e) => updateField('cancel_after_dispatch_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">After driver assigned</p>
            </div>

            <div className="space-y-2">
              <Label>En Route</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.cancel_en_route_fee_cents / 100}
                  onChange={(e) => updateField('cancel_en_route_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Driver is on the way</p>
            </div>

            <div className="space-y-2">
              <Label>On Scene</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.cancel_on_scene_fee_cents / 100}
                  onChange={(e) => updateField('cancel_on_scene_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Driver has arrived</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Storage Policies
          </CardTitle>
          <CardDescription>
            Impound lot and storage rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Storage Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.storage_daily_rate_cents / 100}
                  onChange={(e) => updateField('storage_daily_rate_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Grace Period</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.storage_grace_period_hours}
                  onChange={(e) => updateField('storage_grace_period_hours', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">hours</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Storage Days</Label>
              <Input
                type="number"
                value={formData.storage_max_days}
                onChange={(e) => updateField('storage_max_days', parseInt(e.target.value || '0'))}
              />
            </div>

            <div className="space-y-2">
              <Label>Lien Sale After</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.storage_lien_sale_days}
                  onChange={(e) => updateField('storage_lien_sale_days', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Release Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Vehicle Release Requirements
          </CardTitle>
          <CardDescription>
            Documents needed to release a vehicle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.release_requires_id}
                onCheckedChange={(v) => updateField('release_requires_id', !!v)}
              />
              <span className="text-sm">Valid ID Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.release_requires_registration}
                onCheckedChange={(v) => updateField('release_requires_registration', !!v)}
              />
              <span className="text-sm">Registration Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.release_requires_title}
                onCheckedChange={(v) => updateField('release_requires_title', !!v)}
              />
              <span className="text-sm">Title Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.release_requires_insurance}
                onCheckedChange={(v) => updateField('release_requires_insurance', !!v)}
              />
              <span className="text-sm">Proof of Insurance</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Authorized Agent</Label>
              <p className="text-xs text-muted-foreground">Someone other than owner can pick up</p>
            </div>
            <Switch
              checked={formData.release_authorized_agent_allowed}
              onCheckedChange={(v) => updateField('release_authorized_agent_allowed', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Police Hold Policy</Label>
            <Textarea
              value={formData.release_police_hold_policy}
              onChange={(e) => updateField('release_police_hold_policy', e.target.value)}
              placeholder="Vehicles on police hold cannot be released until the hold is lifted. Contact [police department] for hold status."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Liability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Liability & Damage
          </CardTitle>
          <CardDescription>
            Waivers and damage disclaimers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pre-Existing Damage Policy</Label>
            <Textarea
              value={formData.pre_existing_damage_policy}
              onChange={(e) => updateField('pre_existing_damage_policy', e.target.value)}
              placeholder="We document all visible damage before towing. Photos are taken for your records."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Damage Waiver (for AI to explain)</Label>
            <Textarea
              value={formData.damage_waiver_text}
              onChange={(e) => updateField('damage_waiver_text', e.target.value)}
              placeholder="Towing inherently involves some risk. We take every precaution but cannot be held responsible for pre-existing mechanical issues."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Liability Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.liability_limit_cents / 100}
                  onChange={(e) => updateField('liability_limit_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                  placeholder="0 = no limit"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Insurance Information</Label>
            <Textarea
              value={formData.insurance_requirement_text}
              onChange={(e) => updateField('insurance_requirement_text', e.target.value)}
              placeholder="We carry $1M liability coverage. Certificate available on request."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lockout Services */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Lockout Services
          </CardTitle>
          <CardDescription>
            Key and lockout service policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maximum Unlock Attempts</Label>
            <Input
              type="number"
              className="w-24"
              value={formData.lockout_attempt_limit}
              onChange={(e) => updateField('lockout_attempt_limit', parseInt(e.target.value || '2'))}
            />
            <p className="text-xs text-muted-foreground">Before recommending locksmith</p>
          </div>

          <div className="space-y-2">
            <Label>Lockout Disclaimer</Label>
            <Textarea
              value={formData.lockout_disclaimer}
              onChange={(e) => updateField('lockout_disclaimer', e.target.value)}
              placeholder="We'll try our best, but some modern vehicles require a locksmith with specialized equipment."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Spare Key Policy</Label>
            <Textarea
              value={formData.spare_key_policy}
              onChange={(e) => updateField('spare_key_policy', e.target.value)}
              placeholder="We do not provide spare keys. Once unlocked, you'll need to contact your dealer for replacement keys."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority & Emergency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Siren className="h-4 w-4" />
            Priority & Emergency Fees
          </CardTitle>
          <CardDescription>
            Rush and emergency surcharges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Service Premium</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.priority_fee_percentage}
                  onChange={(e) => updateField('priority_fee_percentage', parseInt(e.target.value || '0'))}
                  placeholder="0"
                />
                <span className="flex items-center text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Extra for "jump the queue"</p>
            </div>

            <div className="space-y-2">
              <Label>Emergency Surcharge</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.emergency_surcharge_cents / 100}
                  onChange={(e) => updateField('emergency_surcharge_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">For true emergencies</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Dispatch Policies
        </Button>
      </div>
    </div>
  );
}
