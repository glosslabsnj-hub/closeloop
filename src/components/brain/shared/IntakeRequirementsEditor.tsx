/**
 * Intake Requirements Editor
 * Manages required questions the AI must ask callers
 * Supports mode-aware visibility and custom field types
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Plus, Trash2, GripVertical, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface IntakeRequirement {
  id?: string;
  tenant_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  options_json: any;
  is_required: boolean;
  ask_order: number;
  visible_modes: string[];
  visible_intents: string[] | null;
  ai_prompt_hint: string;
  validation_hint: string;
  is_active: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email Address' },
  { value: 'address', label: 'Full Address' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Single Choice' },
  { value: 'multiselect', label: 'Multiple Choice' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
];

const ALL_MODES: BusinessMode[] = ['service', 'dispatch', 'food', 'medical', 'general'];

const SUGGESTED_FIELDS: Partial<IntakeRequirement>[] = [
  // Universal fields
  { field_key: 'customer_name', field_label: "What's your name?", field_type: 'text', is_required: true, ai_prompt_hint: 'Ask for their full name' },
  { field_key: 'customer_phone', field_label: "What's the best number to reach you?", field_type: 'phone', is_required: true, ai_prompt_hint: 'Get their callback number' },
  { field_key: 'customer_email', field_label: "What's your email address?", field_type: 'email', is_required: false, ai_prompt_hint: 'Optional - for confirmation emails' },
  
  // Dispatch-specific fields (P0 required for dispatch mode)
  { field_key: 'pickup_address', field_label: "What's the exact address or cross streets where you are?", field_type: 'address', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Get exact pickup location - street address, highway mile marker, or cross streets' },
  { field_key: 'dropoff_address', field_label: "Where should we take the vehicle?", field_type: 'address', is_required: false, visible_modes: ['dispatch'], ai_prompt_hint: 'Destination - home, shop, or our lot' },
  { field_key: 'vehicle_year', field_label: "What year is the vehicle?", field_type: 'text', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Get vehicle year (e.g., 2019)' },
  { field_key: 'vehicle_make', field_label: "What's the make of the vehicle?", field_type: 'text', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Get vehicle manufacturer (e.g., Honda, Ford, Toyota)' },
  { field_key: 'vehicle_model', field_label: "What's the model?", field_type: 'text', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Get vehicle model (e.g., Civic, F-150, Camry)' },
  { field_key: 'vehicle_color', field_label: "What color is it?", field_type: 'text', is_required: false, visible_modes: ['dispatch'], ai_prompt_hint: 'Get vehicle color so driver can identify it' },
  { field_key: 'is_drivable', field_label: "Is the vehicle drivable or does it need to be towed?", field_type: 'select', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Determines if we need flatbed or can do roadside' },
  { field_key: 'service_needed', field_label: "What service do you need? (tow, jump, lockout, tire, fuel)", field_type: 'text', is_required: true, visible_modes: ['dispatch'], ai_prompt_hint: 'Type of roadside service or tow' },
  { field_key: 'urgency', field_label: "Do you need someone right now or can this be scheduled?", field_type: 'select', is_required: false, visible_modes: ['dispatch'], ai_prompt_hint: 'Emergency vs. scheduled pickup' },
  
  // Service-specific fields
  { field_key: 'service_address', field_label: "What's the service address?", field_type: 'address', is_required: true, visible_modes: ['service'], ai_prompt_hint: 'Get the location for service' },
  { field_key: 'preferred_date', field_label: "When would you like to come in?", field_type: 'date', is_required: false, visible_modes: ['service', 'medical'], ai_prompt_hint: 'Preferred appointment date' },
  { field_key: 'preferred_time', field_label: "What time works best?", field_type: 'text', is_required: false, visible_modes: ['service', 'medical'], ai_prompt_hint: 'Morning, afternoon, or specific time' },
  
  // Food-specific fields
  { field_key: 'party_size', field_label: "How many in your party?", field_type: 'number', is_required: true, visible_modes: ['food'], ai_prompt_hint: 'Number of guests' },
  { field_key: 'delivery_address', field_label: "What's your delivery address?", field_type: 'address', is_required: false, visible_modes: ['food'], ai_prompt_hint: 'Only if delivery, not pickup' },
  
  // Medical-specific fields
  { field_key: 'reason_for_visit', field_label: "What brings you in today?", field_type: 'text', is_required: true, visible_modes: ['medical'], ai_prompt_hint: 'Brief reason for appointment' },
  { field_key: 'insurance_provider', field_label: "Who is your insurance provider?", field_type: 'text', is_required: true, visible_modes: ['medical'], ai_prompt_hint: 'Insurance company name' },
];

interface IntakeRequirementsEditorProps {
  businessMode: BusinessMode;
}

export function IntakeRequirementsEditor({ businessMode }: IntakeRequirementsEditorProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [requirements, setRequirements] = useState<IntakeRequirement[]>([]);

  useEffect(() => {
    if (tenant?.id) {
      loadRequirements();
    }
  }, [tenant?.id]);

  const loadRequirements = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('intake_requirements')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('ask_order', { ascending: true });

      if (error) throw error;
      
      setRequirements(data || []);
    } catch (err: any) {
      toast.error("Failed to load requirements");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      // Delete removed requirements
      const existingIds = requirements.filter(r => r.id).map(r => r.id);
      
      // Upsert all requirements
      for (const req of requirements) {
        const { error } = await supabase
          .from('intake_requirements')
          .upsert({
            ...req,
            tenant_id: tenant.id,
          }, { onConflict: 'tenant_id,field_key' });

        if (error) throw error;
      }
      
      toast.success("Requirements saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      loadRequirements(); // Reload to get IDs
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const addRequirement = () => {
    const newReq: IntakeRequirement = {
      tenant_id: tenant?.id || '',
      field_key: `custom_${Date.now()}`,
      field_label: '',
      field_type: 'text',
      options_json: null,
      is_required: false,
      ask_order: requirements.length * 10 + 10,
      visible_modes: ALL_MODES,
      visible_intents: null,
      ai_prompt_hint: '',
      validation_hint: '',
      is_active: true,
    };
    setRequirements([...requirements, newReq]);
  };

  const addSuggested = (suggested: Partial<IntakeRequirement>) => {
    // Check if already exists
    if (requirements.some(r => r.field_key === suggested.field_key)) {
      toast.info("This field already exists");
      return;
    }
    
    const newReq: IntakeRequirement = {
      tenant_id: tenant?.id || '',
      field_key: suggested.field_key || `custom_${Date.now()}`,
      field_label: suggested.field_label || '',
      field_type: suggested.field_type || 'text',
      options_json: null,
      is_required: suggested.is_required || false,
      ask_order: requirements.length * 10 + 10,
      visible_modes: suggested.visible_modes || ALL_MODES,
      visible_intents: null,
      ai_prompt_hint: suggested.ai_prompt_hint || '',
      validation_hint: '',
      is_active: true,
    };
    setRequirements([...requirements, newReq]);
  };

  const updateRequirement = (index: number, updates: Partial<IntakeRequirement>) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], ...updates };
    setRequirements(updated);
  };

  const removeRequirement = async (index: number) => {
    const req = requirements[index];
    if (req.id) {
      // Delete from database
      const { error } = await supabase
        .from('intake_requirements')
        .delete()
        .eq('id', req.id);
      
      if (error) {
        toast.error("Failed to delete");
        return;
      }
    }
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  // Filter suggestions by current business mode
  const relevantSuggestions = SUGGESTED_FIELDS.filter(s => 
    !s.visible_modes || s.visible_modes.includes(businessMode)
  );

  // Build AI preview
  const buildAIPreview = (): string => {
    const activeReqs = requirements.filter(r => r.is_active);
    if (activeReqs.length === 0) return "No intake questions configured. AI will collect basic info like name and phone.";
    
    const required = activeReqs.filter(r => r.is_required);
    const optional = activeReqs.filter(r => !r.is_required);
    
    let preview = `I'll need to collect ${required.length} required piece${required.length !== 1 ? 's' : ''} of information`;
    if (optional.length > 0) {
      preview += ` and may ask ${optional.length} optional question${optional.length !== 1 ? 's' : ''}`;
    }
    preview += '.';
    
    return preview;
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
      {/* AI Preview */}
      <AIPreviewCard 
        title="How AI collects information"
        preview={buildAIPreview()}
      />

      {/* Suggested Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Add Common Fields</CardTitle>
          <CardDescription>
            Click to add pre-configured intake questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {relevantSuggestions.map((suggestion) => (
              <Button
                key={suggestion.field_key}
                variant="outline"
                size="sm"
                onClick={() => addSuggested(suggestion)}
                disabled={requirements.some(r => r.field_key === suggestion.field_key)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {suggestion.field_label?.replace(/\?$/, '')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Required Questions
          </CardTitle>
          <CardDescription>
            Information the AI will collect from every caller
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No intake questions configured. Add some above or create custom ones.
            </div>
          ) : (
            <div className="space-y-3">
              {requirements.map((req, index) => (
                <div 
                  key={req.field_key} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="pt-2 cursor-move text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Question</Label>
                        <Input
                          value={req.field_label}
                          onChange={(e) => updateRequirement(index, { field_label: e.target.value })}
                          placeholder="What's your...?"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Field Type</Label>
                        <Select 
                          value={req.field_type} 
                          onValueChange={(v) => updateRequirement(index, { field_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={req.is_required}
                          onCheckedChange={(v) => updateRequirement(index, { is_required: v })}
                        />
                        <span className="text-sm">Required</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={req.is_active}
                          onCheckedChange={(v) => updateRequirement(index, { is_active: v })}
                        />
                        <span className="text-sm">Active</span>
                      </label>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRequirement(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <Button variant="outline" onClick={addRequirement} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Question
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Requirements
        </Button>
      </div>
    </div>
  );
}
