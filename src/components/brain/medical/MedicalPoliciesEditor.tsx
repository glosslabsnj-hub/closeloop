/**
 * Medical Policies Editor
 * For clinics, practices, telehealth
 * Handles appointments, insurance, consent, prescriptions, and patient rights
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Calendar, CreditCard, FileText, Pill, FolderOpen, Clock, Heart } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface MedicalPolicies {
  id?: string;
  tenant_id: string;
  // Appointments
  appointment_no_show_fee_cents: number;
  appointment_late_arrival_minutes: number;
  appointment_late_reschedule: boolean;
  cancellation_notice_hours: number;
  cancellation_fee_cents: number;
  new_patient_arrival_minutes: number;
  // Insurance & billing
  insurance_verification_required: boolean;
  insurance_verification_days_before: number;
  out_of_network_disclosure: string;
  balance_due_policy: string;
  payment_plan_available: boolean;
  payment_plan_minimum_cents: number;
  collections_notice: string;
  // Forms & consent
  hipaa_consent_required: boolean;
  treatment_consent_required: boolean;
  financial_agreement_required: boolean;
  minor_consent_policy: string;
  telehealth_consent_required: boolean;
  // Prescriptions
  prescription_refill_notice_days: number;
  prescription_refill_appointment_required: boolean;
  controlled_substance_policy: string;
  // Records
  records_request_fee_cents: number;
  records_request_processing_days: number;
  records_release_form_required: boolean;
  // After hours
  after_hours_contact_policy: string;
  emergency_protocol: string;
  hospital_affiliation: string;
  // Patient rights
  patient_rights_summary: string;
  complaint_procedure: string;
}

const DEFAULT_POLICIES: Omit<MedicalPolicies, 'tenant_id'> = {
  appointment_no_show_fee_cents: 5000,
  appointment_late_arrival_minutes: 15,
  appointment_late_reschedule: true,
  cancellation_notice_hours: 24,
  cancellation_fee_cents: 2500,
  new_patient_arrival_minutes: 15,
  insurance_verification_required: true,
  insurance_verification_days_before: 2,
  out_of_network_disclosure: '',
  balance_due_policy: '',
  payment_plan_available: true,
  payment_plan_minimum_cents: 5000,
  collections_notice: '',
  hipaa_consent_required: true,
  treatment_consent_required: true,
  financial_agreement_required: true,
  minor_consent_policy: '',
  telehealth_consent_required: true,
  prescription_refill_notice_days: 5,
  prescription_refill_appointment_required: false,
  controlled_substance_policy: '',
  records_request_fee_cents: 2500,
  records_request_processing_days: 14,
  records_release_form_required: true,
  after_hours_contact_policy: '',
  emergency_protocol: '',
  hospital_affiliation: '',
  patient_rights_summary: '',
  complaint_procedure: '',
};

export function MedicalPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<MedicalPolicies | null>(null);

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
        .from('medical_policies')
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
        .from('medical_policies')
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

  const updateField = <K extends keyof MedicalPolicies>(field: K, value: MedicalPolicies[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const formatCents = (cents: number) => cents > 0 ? `$${(cents / 100).toFixed(0)}` : 'No fee';

  // Build AI preview
  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];
    
    if (formData.cancellation_notice_hours > 0) {
      parts.push(`Please give us ${formData.cancellation_notice_hours} hours notice to reschedule.`);
    }
    if (formData.new_patient_arrival_minutes > 0) {
      parts.push(`New patients should arrive ${formData.new_patient_arrival_minutes} minutes early.`);
    }
    if (formData.insurance_verification_required) {
      parts.push("We verify insurance before your visit.");
    }
    
    return parts.length > 0 ? parts.join(' ') : "No specific medical policies configured yet.";
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
        title="How AI explains your practice policies"
        preview={buildAIPreview()}
      />

      {/* Appointment Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointment Policies
          </CardTitle>
          <CardDescription>
            Scheduling, cancellations, and no-shows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No-Show Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.appointment_no_show_fee_cents / 100}
                  onChange={(e) => updateField('appointment_no_show_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cancellation Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.cancellation_fee_cents / 100}
                  onChange={(e) => updateField('cancellation_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cancellation Notice Required</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.cancellation_notice_hours}
                  onChange={(e) => updateField('cancellation_notice_hours', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">hours</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Late Arrival Grace Period</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.appointment_late_arrival_minutes}
                  onChange={(e) => updateField('appointment_late_arrival_minutes', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">min</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Reschedule Late Arrivals</Label>
              <p className="text-xs text-muted-foreground">Require rescheduling if patient arrives late</p>
            </div>
            <Switch
              checked={formData.appointment_late_reschedule}
              onCheckedChange={(v) => updateField('appointment_late_reschedule', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>New Patient Early Arrival</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                className="w-24"
                value={formData.new_patient_arrival_minutes}
                onChange={(e) => updateField('new_patient_arrival_minutes', parseInt(e.target.value || '0'))}
              />
              <span className="text-sm text-muted-foreground">minutes before appointment</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance & Billing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Insurance & Billing
          </CardTitle>
          <CardDescription>
            Payment, insurance, and billing policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Insurance Verification Required</Label>
              <p className="text-xs text-muted-foreground">Verify coverage before appointments</p>
            </div>
            <Switch
              checked={formData.insurance_verification_required}
              onCheckedChange={(v) => updateField('insurance_verification_required', v)}
            />
          </div>

          {formData.insurance_verification_required && (
            <div className="space-y-2">
              <Label>Verify Coverage</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  className="w-24"
                  value={formData.insurance_verification_days_before}
                  onChange={(e) => updateField('insurance_verification_days_before', parseInt(e.target.value || '0'))}
                />
                <span className="text-sm text-muted-foreground">days before appointment</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Out-of-Network Disclosure</Label>
            <Textarea
              value={formData.out_of_network_disclosure}
              onChange={(e) => updateField('out_of_network_disclosure', e.target.value)}
              placeholder="We are out-of-network with some insurance plans. You may have out-of-pocket costs that can be submitted to your insurance for reimbursement."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Balance Due Policy</Label>
            <Textarea
              value={formData.balance_due_policy}
              onChange={(e) => updateField('balance_due_policy', e.target.value)}
              placeholder="Copays and deductibles are due at time of service. Outstanding balances are due within 30 days."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Payment Plans Available</Label>
              <p className="text-xs text-muted-foreground">Offer payment plans for large balances</p>
            </div>
            <Switch
              checked={formData.payment_plan_available}
              onCheckedChange={(v) => updateField('payment_plan_available', v)}
            />
          </div>

          {formData.payment_plan_available && (
            <div className="space-y-2">
              <Label>Minimum Balance for Payment Plan</Label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.payment_plan_minimum_cents / 100}
                  onChange={(e) => updateField('payment_plan_minimum_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Collections Notice</Label>
            <Textarea
              value={formData.collections_notice}
              onChange={(e) => updateField('collections_notice', e.target.value)}
              placeholder="Accounts past due 90 days may be referred to collections."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Forms & Consent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Forms & Consent
          </CardTitle>
          <CardDescription>
            Required forms and consent documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.hipaa_consent_required}
                onCheckedChange={(v) => updateField('hipaa_consent_required', v)}
              />
              <span className="text-sm">HIPAA Consent Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.treatment_consent_required}
                onCheckedChange={(v) => updateField('treatment_consent_required', v)}
              />
              <span className="text-sm">Treatment Consent Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.financial_agreement_required}
                onCheckedChange={(v) => updateField('financial_agreement_required', v)}
              />
              <span className="text-sm">Financial Agreement Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.telehealth_consent_required}
                onCheckedChange={(v) => updateField('telehealth_consent_required', v)}
              />
              <span className="text-sm">Telehealth Consent Required</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label>Minor Consent Policy</Label>
            <Textarea
              value={formData.minor_consent_policy}
              onChange={(e) => updateField('minor_consent_policy', e.target.value)}
              placeholder="Patients under 18 must have a parent or legal guardian present for treatment, except in emergency situations."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescriptions
          </CardTitle>
          <CardDescription>
            Medication refill and controlled substance policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Refill Notice Required</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.prescription_refill_notice_days}
                  onChange={(e) => updateField('prescription_refill_notice_days', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Appointment Required for Refills</Label>
              <p className="text-xs text-muted-foreground">Some medications require an office visit</p>
            </div>
            <Switch
              checked={formData.prescription_refill_appointment_required}
              onCheckedChange={(v) => updateField('prescription_refill_appointment_required', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Controlled Substance Policy</Label>
            <Textarea
              value={formData.controlled_substance_policy}
              onChange={(e) => updateField('controlled_substance_policy', e.target.value)}
              placeholder="Controlled substances require in-person appointments. Early refills are not permitted. Lost prescriptions cannot be replaced."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Medical Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Medical Records
          </CardTitle>
          <CardDescription>
            Records requests and release policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Records Request Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.records_request_fee_cents / 100}
                  onChange={(e) => updateField('records_request_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Processing Time</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.records_request_processing_days}
                  onChange={(e) => updateField('records_request_processing_days', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Release Form Required</Label>
              <p className="text-xs text-muted-foreground">Written authorization needed for records release</p>
            </div>
            <Switch
              checked={formData.records_release_form_required}
              onCheckedChange={(v) => updateField('records_release_form_required', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* After Hours & Emergency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            After Hours & Emergency
          </CardTitle>
          <CardDescription>
            Emergency protocols and after-hours contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>After-Hours Contact Policy</Label>
            <Textarea
              value={formData.after_hours_contact_policy}
              onChange={(e) => updateField('after_hours_contact_policy', e.target.value)}
              placeholder="For urgent matters after hours, call our main number and follow the prompts for the on-call provider. For emergencies, call 911."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Emergency Protocol</Label>
            <Textarea
              value={formData.emergency_protocol}
              onChange={(e) => updateField('emergency_protocol', e.target.value)}
              placeholder="For life-threatening emergencies, call 911 immediately. Do not wait to contact our office."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Hospital Affiliation</Label>
            <Textarea
              value={formData.hospital_affiliation}
              onChange={(e) => updateField('hospital_affiliation', e.target.value)}
              placeholder="We have privileges at City General Hospital and can arrange admissions if needed."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient Rights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Patient Rights
          </CardTitle>
          <CardDescription>
            Rights and complaint procedures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Patient Rights Summary</Label>
            <Textarea
              value={formData.patient_rights_summary}
              onChange={(e) => updateField('patient_rights_summary', e.target.value)}
              placeholder="You have the right to be treated with respect, understand your diagnosis and treatment options, and access your medical records."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Complaint Procedure</Label>
            <Textarea
              value={formData.complaint_procedure}
              onChange={(e) => updateField('complaint_procedure', e.target.value)}
              placeholder="If you have concerns about your care, please speak with our office manager. You may also file a complaint with the State Medical Board."
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
          Save Medical Policies
        </Button>
      </div>
    </div>
  );
}
