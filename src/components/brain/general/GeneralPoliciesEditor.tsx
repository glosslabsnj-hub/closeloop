/**
 * General Policies Editor
 * For general businesses or as fallback for all modes
 * Handles contact, privacy, terms, and accessibility policies
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
import { Loader2, Save, Phone, Lock, FileText, Cloud, Accessibility, Globe } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";
import { Badge } from "@/components/ui/badge";

interface GeneralPolicies {
  id?: string;
  tenant_id: string;
  // Contact
  response_time_hours: number;
  preferred_contact_method: string;
  callback_availability: string;
  // Privacy
  privacy_policy_url: string;
  data_retention_policy: string;
  marketing_opt_in_default: boolean;
  // Terms
  terms_of_service_url: string;
  dispute_resolution_policy: string;
  // Seasonal
  holiday_policy: string;
  weather_cancellation_policy: string;
  force_majeure_text: string;
  // Accessibility
  ada_accommodations_text: string;
  language_support: string[];
}

const DEFAULT_POLICIES: Omit<GeneralPolicies, 'tenant_id'> = {
  response_time_hours: 24,
  preferred_contact_method: 'phone',
  callback_availability: '',
  privacy_policy_url: '',
  data_retention_policy: '',
  marketing_opt_in_default: false,
  terms_of_service_url: '',
  dispute_resolution_policy: '',
  holiday_policy: '',
  weather_cancellation_policy: '',
  force_majeure_text: '',
  ada_accommodations_text: '',
  language_support: ['english'],
};

const LANGUAGE_OPTIONS = [
  { id: 'english', label: 'English' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'french', label: 'French' },
  { id: 'mandarin', label: 'Mandarin' },
  { id: 'vietnamese', label: 'Vietnamese' },
  { id: 'korean', label: 'Korean' },
  { id: 'tagalog', label: 'Tagalog' },
  { id: 'german', label: 'German' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'portuguese', label: 'Portuguese' },
];

export function GeneralPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<GeneralPolicies | null>(null);

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
        .from('general_policies')
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
        .from('general_policies')
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

  const updateField = <K extends keyof GeneralPolicies>(field: K, value: GeneralPolicies[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const toggleLanguage = (lang: string) => {
    const current = formData?.language_support || [];
    if (current.includes(lang)) {
      updateField('language_support', current.filter(l => l !== lang));
    } else {
      updateField('language_support', [...current, lang]);
    }
  };

  // Build AI preview
  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];
    
    if (formData.response_time_hours > 0) {
      parts.push(`We typically respond within ${formData.response_time_hours} hours.`);
    }
    if (formData.language_support.length > 1) {
      parts.push(`We can help in ${formData.language_support.join(', ')}.`);
    }
    
    return parts.length > 0 ? parts.join(' ') : "No specific general policies configured yet.";
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
        title="How AI explains your general policies"
        preview={buildAIPreview()}
      />

      {/* Contact Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact & Response
          </CardTitle>
          <CardDescription>
            How and when you respond to inquiries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typical Response Time</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.response_time_hours}
                  onChange={(e) => updateField('response_time_hours', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">hours</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Contact Method</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.preferred_contact_method}
                onChange={(e) => updateField('preferred_contact_method', e.target.value)}
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="text">Text/SMS</option>
                <option value="any">Any Method</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Callback Availability</Label>
            <Textarea
              value={formData.callback_availability}
              onChange={(e) => updateField('callback_availability', e.target.value)}
              placeholder="We return calls Monday-Friday, 9am-5pm. Messages left after hours will be returned the next business day."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Data handling and privacy policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Privacy Policy URL</Label>
            <Input
              type="url"
              value={formData.privacy_policy_url}
              onChange={(e) => updateField('privacy_policy_url', e.target.value)}
              placeholder="https://yoursite.com/privacy"
            />
          </div>

          <div className="space-y-2">
            <Label>Data Retention Policy (for AI to explain)</Label>
            <Textarea
              value={formData.data_retention_policy}
              onChange={(e) => updateField('data_retention_policy', e.target.value)}
              placeholder="We keep your information secure and never sell it to third parties. Call recordings are stored for 90 days for quality purposes."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing Opt-In Default</Label>
              <p className="text-xs text-muted-foreground">New contacts opted in by default</p>
            </div>
            <Switch
              checked={formData.marketing_opt_in_default}
              onCheckedChange={(v) => updateField('marketing_opt_in_default', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms & Disputes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Terms & Disputes
          </CardTitle>
          <CardDescription>
            Terms of service and dispute resolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Terms of Service URL</Label>
            <Input
              type="url"
              value={formData.terms_of_service_url}
              onChange={(e) => updateField('terms_of_service_url', e.target.value)}
              placeholder="https://yoursite.com/terms"
            />
          </div>

          <div className="space-y-2">
            <Label>Dispute Resolution Policy</Label>
            <Textarea
              value={formData.dispute_resolution_policy}
              onChange={(e) => updateField('dispute_resolution_policy', e.target.value)}
              placeholder="If you're not satisfied, please contact us first. We want to make things right before any formal dispute process."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Seasonal & Weather */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Seasonal & Weather
          </CardTitle>
          <CardDescription>
            Holiday hours and weather-related policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Holiday Policy</Label>
            <Textarea
              value={formData.holiday_policy}
              onChange={(e) => updateField('holiday_policy', e.target.value)}
              placeholder="We're closed on major holidays. Check our website or call for holiday hours."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Weather Cancellation Policy</Label>
            <Textarea
              value={formData.weather_cancellation_policy}
              onChange={(e) => updateField('weather_cancellation_policy', e.target.value)}
              placeholder="In severe weather, we may reschedule for safety. We'll contact you as soon as possible if this happens."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Force Majeure / Circumstances Beyond Control</Label>
            <Textarea
              value={formData.force_majeure_text}
              onChange={(e) => updateField('force_majeure_text', e.target.value)}
              placeholder="We're not responsible for delays caused by natural disasters, pandemics, or other circumstances beyond our control."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Accessibility & Languages
          </CardTitle>
          <CardDescription>
            ADA accommodations and language support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ADA Accommodations</Label>
            <Textarea
              value={formData.ada_accommodations_text}
              onChange={(e) => updateField('ada_accommodations_text', e.target.value)}
              placeholder="We're committed to accessibility. Let us know if you need any accommodations and we'll do our best to help."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Languages Supported
            </Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <Badge
                  key={lang.id}
                  variant={formData.language_support.includes(lang.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleLanguage(lang.id)}
                >
                  {lang.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Click to toggle. AI will mention available languages when relevant.</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save General Policies
        </Button>
      </div>
    </div>
  );
}
