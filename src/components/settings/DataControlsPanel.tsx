import { useState, useEffect } from "react";
import { useDataRetentionSettings } from "@/hooks/useDataRetentionSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
  Phone,
  Brain,
  CheckCircle2,
  XCircle,
  Database
} from "lucide-react";

export function DataControlsPanel() {
  const { 
    settings, 
    isLoading, 
    updateSettings, 
    isUpdating,
    hipaaMode,
    businessMode,
    storedDataList,
    notStoredList,
    isHIPAACompliant,
  } = useDataRetentionSettings();

  const [formValues, setFormValues] = useState(settings);

  useEffect(() => {
    if (settings) {
      setFormValues(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      store_recordings: formValues.store_recordings,
      store_transcripts: formValues.store_transcripts,
      store_caller_phone: formValues.store_caller_phone,
      recording_retention_days: formValues.recording_retention_days,
      transcript_retention_days: formValues.transcript_retention_days,
      call_summary_retention_days: formValues.call_summary_retention_days,
      audit_log_retention_days: formValues.audit_log_retention_days,
      require_verbal_consent: formValues.require_verbal_consent,
      phi_minimization_enabled: formValues.phi_minimization_enabled,
      allow_customer_memory: formValues.allow_customer_memory,
    });
  };

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
      {/* Mode Indicator */}
      <Alert variant={hipaaMode ? "default" : "default"} className={hipaaMode ? "border-amber-500/50 bg-amber-500/5" : ""}>
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">
              {hipaaMode ? "HIPAA Mode Active" : `${businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} Mode`}
            </span>
            <span className="ml-2 text-muted-foreground">
              {hipaaMode 
                ? "Strict data isolation is enforced. PHI is minimized by default." 
                : "Standard data retention policies apply."}
            </span>
          </div>
          {hipaaMode && (
            <Badge variant={isHIPAACompliant ? "default" : "destructive"} className="ml-2">
              {isHIPAACompliant ? "Compliant" : "Review Settings"}
            </Badge>
          )}
        </AlertDescription>
      </Alert>

      {/* What's Stored Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">What IS Stored</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  {storedDataList.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">What is NOT Stored</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  {notStoredList.length > 0 ? (
                    notStoredList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">All standard data types are stored</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Storage Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Storage Controls
          </CardTitle>
          <CardDescription>
            Configure what call data is stored. Changes apply to future calls immediately.
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
                Audio recordings of all AI-handled calls
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hipaaMode && formValues.store_recordings && (
                <Badge variant="destructive" className="text-xs">Not recommended</Badge>
              )}
              <Switch
                id="store-recordings"
                checked={formValues.store_recordings}
                onCheckedChange={(checked) => 
                  setFormValues({ ...formValues, store_recordings: checked })
                }
              />
            </div>
          </div>

          {hipaaMode && formValues.store_recordings && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Storing recordings in HIPAA mode requires BAA compliance and increases security obligations.
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
                Word-for-word conversation logs. AI summaries are always stored.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {formValues.store_transcripts ? "Full text" : "Summaries only"}
              </Badge>
              <Switch
                id="store-transcripts"
                checked={formValues.store_transcripts}
                onCheckedChange={(checked) => 
                  setFormValues({ ...formValues, store_transcripts: checked })
                }
              />
            </div>
          </div>

          {/* Caller Phone Storage */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="store-phone" className="font-medium">
                  Store Caller Phone Numbers
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {formValues.store_caller_phone 
                  ? "Phone numbers are stored for customer matching" 
                  : "Phone numbers will be redacted in logs"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!formValues.store_caller_phone && (
                <Badge variant="secondary" className="text-xs">Redacted</Badge>
              )}
              <Switch
                id="store-phone"
                checked={formValues.store_caller_phone}
                onCheckedChange={(checked) => 
                  setFormValues({ ...formValues, store_caller_phone: checked })
                }
              />
            </div>
          </div>

          {/* Customer Memory */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="allow-memory" className="font-medium">
                  Customer-Specific Memory
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Allow AI to remember individual customer preferences
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hipaaMode && formValues.allow_customer_memory && (
                <Badge variant="destructive" className="text-xs">PHI risk</Badge>
              )}
              <Switch
                id="allow-memory"
                checked={formValues.allow_customer_memory}
                onCheckedChange={(checked) => 
                  setFormValues({ ...formValues, allow_customer_memory: checked })
                }
                disabled={hipaaMode}
              />
            </div>
          </div>

          {hipaaMode && (
            <p className="text-xs text-muted-foreground">
              Customer-specific memory is disabled in HIPAA mode to prevent PHI storage.
            </p>
          )}

          <Separator />

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
                AI will ask callers to confirm consent before collecting information
              </p>
            </div>
            <Switch
              id="require-consent"
              checked={formValues.require_verbal_consent}
              onCheckedChange={(checked) => 
                setFormValues({ ...formValues, require_verbal_consent: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Retention Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Retention Periods
          </CardTitle>
          <CardDescription>
            Data older than these periods will be automatically deleted. Use 0 for immediate deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recording-days">Recording Retention</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="recording-days"
                  type="number"
                  min={0}
                  max={365}
                  value={formValues.recording_retention_days || 0}
                  onChange={(e) => 
                    setFormValues({ 
                      ...formValues, 
                      recording_retention_days: parseInt(e.target.value) || 0 
                    })
                  }
                  className="w-24"
                  disabled={!formValues.store_recordings}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript-days">Transcript Retention</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="transcript-days"
                  type="number"
                  min={0}
                  max={365}
                  value={formValues.transcript_retention_days || 0}
                  onChange={(e) => 
                    setFormValues({ 
                      ...formValues, 
                      transcript_retention_days: parseInt(e.target.value) || 0 
                    })
                  }
                  className="w-24"
                  disabled={!formValues.store_transcripts}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary-days">Call Summary Retention</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="summary-days"
                  type="number"
                  min={30}
                  max={730}
                  value={formValues.call_summary_retention_days || 365}
                  onChange={(e) => 
                    setFormValues({ 
                      ...formValues, 
                      call_summary_retention_days: parseInt(e.target.value) || 365 
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audit-days">Audit Log Retention</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="audit-days"
                  type="number"
                  min={90}
                  max={2555}
                  value={formValues.audit_log_retention_days || 730}
                  onChange={(e) => 
                    setFormValues({ 
                      ...formValues, 
                      audit_log_retention_days: parseInt(e.target.value) || 730 
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isUpdating}
          size="lg"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Data Controls
        </Button>
      </div>
    </div>
  );
}
