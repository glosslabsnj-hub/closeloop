/**
 * Service Policies Editor
 * For salons, HVAC, plumbers, cleaners, contractors, etc.
 * Handles scheduling, guarantees, property, and liability policies
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Clock, Shield, Home, AlertTriangle, Car } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface ServicePolicies {
  id?: string;
  tenant_id: string;
  // Scheduling
  no_show_fee_cents: number;
  no_show_fee_type: string;
  late_arrival_grace_minutes: number;
  late_arrival_fee_cents: number;
  rescheduling_notice_hours: number;
  rescheduling_fee_cents: number;
  max_reschedules_allowed: number;
  // Guarantees
  satisfaction_guarantee_enabled: boolean;
  satisfaction_guarantee_text: string;
  warranty_days: number | null;
  warranty_text: string;
  // Property
  pet_policy: string;
  parking_requirements: string;
  access_requirements: string;
  age_restriction_years: number | null;
  // Liability
  liability_waiver_required: boolean;
  liability_waiver_text: string;
  damage_policy: string;
  insurance_info: string;
  // Travel
  travel_fee_policy: string;
  minimum_service_charge_cents: number;
}

const DEFAULT_POLICIES: Omit<ServicePolicies, 'tenant_id'> = {
  no_show_fee_cents: 0,
  no_show_fee_type: 'fixed',
  late_arrival_grace_minutes: 15,
  late_arrival_fee_cents: 0,
  rescheduling_notice_hours: 24,
  rescheduling_fee_cents: 0,
  max_reschedules_allowed: 2,
  satisfaction_guarantee_enabled: false,
  satisfaction_guarantee_text: '',
  warranty_days: null,
  warranty_text: '',
  pet_policy: '',
  parking_requirements: '',
  access_requirements: '',
  age_restriction_years: null,
  liability_waiver_required: false,
  liability_waiver_text: '',
  damage_policy: '',
  insurance_info: '',
  travel_fee_policy: '',
  minimum_service_charge_cents: 0,
};

export function ServicePoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { terminology } = useIndustryContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ServicePolicies | null>(null);

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
        .from('service_policies')
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
        .from('service_policies')
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

  const updateField = <K extends keyof ServicePolicies>(field: K, value: ServicePolicies[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const formatCents = (cents: number) => cents > 0 ? `$${(cents / 100).toFixed(0)}` : 'No fee';

  // Build AI preview
  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];
    
    if (formData.no_show_fee_cents > 0) {
      parts.push(`No-shows are charged ${formatCents(formData.no_show_fee_cents)}.`);
    }
    if (formData.late_arrival_grace_minutes > 0) {
      parts.push(`We have a ${formData.late_arrival_grace_minutes}-minute grace period for late arrivals.`);
    }
    if (formData.satisfaction_guarantee_enabled) {
      parts.push("We offer a satisfaction guarantee.");
    }
    if (formData.pet_policy) {
      parts.push(formData.pet_policy);
    }
    
    return parts.length > 0 ? parts.join(' ') : "No specific service policies configured yet.";
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
        title="How AI explains your service policies"
        preview={buildAIPreview()}
      />

      {/* Scheduling Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduling Policies
          </CardTitle>
          <CardDescription>
            No-shows, late arrivals, and rescheduling rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* No-show fee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No-Show Fee</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={formData.no_show_fee_cents / 100}
                    onChange={(e) => updateField('no_show_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    placeholder="0"
                  />
                </div>
                <Select 
                  value={formData.no_show_fee_type} 
                  onValueChange={(v) => updateField('no_show_fee_type', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percentage">% of service</SelectItem>
                    <SelectItem value="full_service">Full price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Late Arrival Grace Period</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.late_arrival_grace_minutes}
                  onChange={(e) => updateField('late_arrival_grace_minutes', parseInt(e.target.value || '0'))}
                  placeholder="15"
                />
                <span className="flex items-center text-sm text-muted-foreground">min</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Late Arrival Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.late_arrival_fee_cents / 100}
                  onChange={(e) => updateField('late_arrival_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rescheduling Notice Required</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.rescheduling_notice_hours}
                  onChange={(e) => updateField('rescheduling_notice_hours', parseInt(e.target.value || '0'))}
                  placeholder="24"
                />
                <span className="flex items-center text-sm text-muted-foreground">hours</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rescheduling Fee (late notice)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.rescheduling_fee_cents / 100}
                  onChange={(e) => updateField('rescheduling_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Reschedules Allowed</Label>
              <Input
                type="number"
                value={formData.max_reschedules_allowed}
                onChange={(e) => updateField('max_reschedules_allowed', parseInt(e.target.value || '0'))}
                placeholder="2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Guarantees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Guarantees & Warranties
          </CardTitle>
          <CardDescription>
            Your service quality promises
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Satisfaction Guarantee</Label>
              <p className="text-xs text-muted-foreground">Offer to make it right if customer isn't satisfied</p>
            </div>
            <Switch
              checked={formData.satisfaction_guarantee_enabled}
              onCheckedChange={(v) => updateField('satisfaction_guarantee_enabled', v)}
            />
          </div>

          {formData.satisfaction_guarantee_enabled && (
            <div className="space-y-2">
              <Label>Guarantee Details</Label>
              <Textarea
                value={formData.satisfaction_guarantee_text}
                onChange={(e) => updateField('satisfaction_guarantee_text', e.target.value)}
                placeholder="If you're not 100% satisfied, we'll come back and make it right at no extra charge."
                rows={2}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warranty Period</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.warranty_days || ''}
                  onChange={(e) => updateField('warranty_days', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="30"
                />
                <span className="flex items-center text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warranty Terms</Label>
            <Textarea
              value={formData.warranty_text}
              onChange={(e) => updateField('warranty_text', e.target.value)}
              placeholder="All workmanship is warranted for 30 days. Parts warranties vary by manufacturer."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Property/Premises */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4" />
            Property & Access
          </CardTitle>
          <CardDescription>
            Requirements for service at customer locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pet Policy</Label>
            <Select 
              value={formData.pet_policy || 'none'} 
              onValueChange={(v) => updateField('pet_policy', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pet policy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific policy</SelectItem>
                <SelectItem value="We love pets! No need to secure them.">Pets welcome</SelectItem>
                <SelectItem value="Please secure pets in another room during service.">Please secure pets</SelectItem>
                <SelectItem value="For safety, pets must be secured or removed during service.">Pets must be secured</SelectItem>
                <SelectItem value="No pets on premises during service.">No pets during service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Parking Requirements</Label>
            <Textarea
              value={formData.parking_requirements}
              onChange={(e) => updateField('parking_requirements', e.target.value)}
              placeholder="Please ensure our service vehicle has clear access to the driveway or provide visitor parking info."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Access Requirements</Label>
            <Textarea
              value={formData.access_requirements}
              onChange={(e) => updateField('access_requirements', e.target.value)}
              placeholder={`Gate codes, lockbox info, or key arrangements should be provided 24 hours before your ${terminology.appointmentLabel}.`}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Age Restriction (if applicable)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                className="w-24"
                value={formData.age_restriction_years || ''}
                onChange={(e) => updateField('age_restriction_years', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="18"
              />
              <span className="text-sm text-muted-foreground">years or older required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Liability & Insurance
          </CardTitle>
          <CardDescription>
            Waivers, damage policies, and coverage info
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Liability Waiver</Label>
              <p className="text-xs text-muted-foreground">Customers must sign before service begins</p>
            </div>
            <Switch
              checked={formData.liability_waiver_required}
              onCheckedChange={(v) => updateField('liability_waiver_required', v)}
            />
          </div>

          {formData.liability_waiver_required && (
            <div className="space-y-2">
              <Label>Waiver Summary (for AI to explain)</Label>
              <Textarea
                value={formData.liability_waiver_text}
                onChange={(e) => updateField('liability_waiver_text', e.target.value)}
                placeholder="You'll need to sign a standard liability waiver before we begin. It covers normal risks associated with the service."
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Damage Policy</Label>
            <Textarea
              value={formData.damage_policy}
              onChange={(e) => updateField('damage_policy', e.target.value)}
              placeholder="Pre-existing damage should be documented before service. Any damage caused by our team will be repaired or compensated."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Insurance Information</Label>
            <Textarea
              value={formData.insurance_info}
              onChange={(e) => updateField('insurance_info', e.target.value)}
              placeholder="We are fully licensed and insured. Proof of insurance available upon request."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Travel & Minimums */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Travel & Minimums
          </CardTitle>
          <CardDescription>
            Service call minimums and travel charges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Service Charge</Label>
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                className="pl-7"
                value={formData.minimum_service_charge_cents / 100}
                onChange={(e) => updateField('minimum_service_charge_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                placeholder="0"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum charge for any service call</p>
          </div>

          <div className="space-y-2">
            <Label>Travel Fee Policy</Label>
            <Textarea
              value={formData.travel_fee_policy}
              onChange={(e) => updateField('travel_fee_policy', e.target.value)}
              placeholder="Travel within 10 miles is free. Beyond that, a $1/mile travel fee applies."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Service Policies
        </Button>
      </div>
    </div>
  );
}
