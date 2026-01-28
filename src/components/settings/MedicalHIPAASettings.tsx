import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Mic, 
  FileText, 
  Clock,
  AlertTriangle,
  Save,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export function MedicalHIPAASettings() {
  const { tenant } = useAuth();
  const { hipaaMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["medical-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("medical_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const [formValues, setFormValues] = useState({
    store_recordings: false,
    store_transcripts: false,
    require_verbal_consent: true,
    retention_days: 30,
  });

  // Update form values when settings load
  const effectiveValues = settings ? {
    store_recordings: settings.store_recordings,
    store_transcripts: settings.store_transcripts,
    require_verbal_consent: settings.require_verbal_consent,
    retention_days: settings.retention_days,
  } : formValues;

  const updateMutation = useMutation({
    mutationFn: async (updates: typeof formValues) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { error } = await supabase
        .from("medical_settings")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-settings"] });
      toast.success("HIPAA settings updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update settings", { description: error.message });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      store_recordings: effectiveValues.store_recordings,
      store_transcripts: effectiveValues.store_transcripts,
      require_verbal_consent: effectiveValues.require_verbal_consent,
      retention_days: effectiveValues.retention_days,
    });
  };

  if (!hipaaMode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>HIPAA settings are only available for medical practices</p>
            <p className="text-sm mt-2">
              Switch to Medical mode to access these settings
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>HIPAA Mode Active:</strong> These settings control how patient data 
          is stored and retained. Changes apply to all future calls immediately.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Storage Settings
          </CardTitle>
          <CardDescription>
            Control what call data is stored for compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Storage */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="store-recordings" className="font-medium">
                  Store Call Recordings
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Audio recordings contain PHI and require extra security measures
              </p>
            </div>
            <div className="flex items-center gap-2">
              {effectiveValues.store_recordings ? (
                <Badge variant="destructive" className="text-xs">Not recommended</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Secure</Badge>
              )}
              <Switch
                id="store-recordings"
                checked={effectiveValues.store_recordings}
                onCheckedChange={(checked) => 
                  setFormValues({ ...effectiveValues, store_recordings: checked })
                }
              />
            </div>
          </div>

          {effectiveValues.store_recordings && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Storing recordings increases compliance requirements. Ensure your 
                organization has proper BAAs and security measures in place.
              </AlertDescription>
            </Alert>
          )}

          {/* Transcript Storage */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="store-transcripts" className="font-medium">
                  Store Full Transcripts
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Full transcripts may contain patient details. AI summaries are always stored.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {effectiveValues.store_transcripts ? (
                <Badge variant="secondary" className="text-xs">Enabled</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Summaries only</Badge>
              )}
              <Switch
                id="store-transcripts"
                checked={effectiveValues.store_transcripts}
                onCheckedChange={(checked) => 
                  setFormValues({ ...effectiveValues, store_transcripts: checked })
                }
              />
            </div>
          </div>

          {/* Verbal Consent */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="require-consent" className="font-medium">
                  Require Verbal Consent
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                AI will ask callers to confirm consent before collecting intake information
              </p>
            </div>
            <Switch
              id="require-consent"
              checked={effectiveValues.require_verbal_consent}
              onCheckedChange={(checked) => 
                setFormValues({ ...effectiveValues, require_verbal_consent: checked })
              }
            />
          </div>

          {/* Retention Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="retention-days" className="font-medium">
                Data Retention Period
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Call summaries and intake data older than this will be automatically deleted
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="retention-days"
                type="number"
                min={7}
                max={365}
                value={effectiveValues.retention_days}
                onChange={(e) => 
                  setFormValues({ 
                    ...effectiveValues, 
                    retention_days: parseInt(e.target.value) || 30 
                  })
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save HIPAA Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">What the AI stores by default</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Structured intake fields (reason for visit, preferred time, etc.)</li>
                <li>• AI-generated summary of the call (no verbatim PHI)</li>
                <li>• Consent timestamp (if verbal consent required)</li>
                <li>• Caller phone is redacted in stored context</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
