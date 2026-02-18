import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMedicalWorkflowConfig } from "@/hooks/useWorkflowConfig";
import type { MedicalWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { AlertCircle, CheckCircle2, Loader2, Info, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MedicalWorkflowConfig() {
  const { config, isLoading, update, isUpdating } = useMedicalWorkflowConfig();
  const [localConfig, setLocalConfig] = useState<Partial<MedicalWorkflowConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleUpdate = (field: keyof MedicalWorkflowConfig, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    update(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HIPAA Notice */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <strong>HIPAA Compliance:</strong> These settings control how protected health information
          (PHI) is collected. Ensure your workflow complies with HIPAA regulations and your
          organization's privacy policies.
        </AlertDescription>
      </Alert>

      {/* Save Bar */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* HIPAA Consent */}
      <Card>
        <CardHeader>
          <CardTitle>HIPAA Consent Collection</CardTitle>
          <CardDescription>
            Configure when and how to obtain verbal consent for health information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Consent Timing */}
          <div className="space-y-2">
            <Label>When to collect consent</Label>
            <Select
              value={localConfig.consent_timing || "before_intake"}
              onValueChange={(value) => handleUpdate("consent_timing", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before_intake">
                  Before Intake (before asking reason for visit)
                </SelectItem>
                <SelectItem value="after_reason">
                  After Reason (after understanding why they're calling)
                </SelectItem>
                <SelectItem value="at_end">At End (before finalizing appointment)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localConfig.consent_timing === "before_intake" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Most secure: Get consent before collecting any health details
                </>
              )}
              {localConfig.consent_timing === "after_reason" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Balanced: Understand the general reason, then get consent for details
                </>
              )}
              {localConfig.consent_timing === "at_end" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Least restrictive: Collect basic info first, consent at confirmation
                </>
              )}
            </p>
          </div>

          {/* Consent Script */}
          <div className="space-y-2">
            <Label>Consent script</Label>
            <Textarea
              value={localConfig.consent_script || ""}
              onChange={(e) => handleUpdate("consent_script", e.target.value)}
              placeholder="Before we continue, I need your verbal consent to collect your health information. Do I have your permission to proceed?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              What the agent will say when requesting consent
            </p>
          </div>

          {/* Require Explicit Consent */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require explicit verbal consent</Label>
              <p className="text-sm text-muted-foreground">
                Agent must hear "yes" or "I consent" - cannot proceed without it
              </p>
            </div>
            <Switch
              checked={localConfig.require_explicit_consent ?? true}
              onCheckedChange={(checked) => handleUpdate("require_explicit_consent", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Symptom Collection */}
      <Card>
        <CardHeader>
          <CardTitle>Symptom & Health Information</CardTitle>
          <CardDescription>
            Configure how the agent collects health-related information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collect Symptom Details */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collect detailed symptom information</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask follow-up questions about symptoms
              </p>
            </div>
            <Switch
              checked={localConfig.collect_symptom_details ?? true}
              onCheckedChange={(checked) => handleUpdate("collect_symptom_details", checked)}
            />
          </div>

          {/* Symptom Severity Scale */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use symptom severity scale</Label>
              <p className="text-sm text-muted-foreground">
                Ask patients to rate pain/symptoms on a scale of 1-10
              </p>
            </div>
            <Switch
              checked={localConfig.symptom_severity_scale ?? true}
              onCheckedChange={(checked) => handleUpdate("symptom_severity_scale", checked)}
            />
          </div>

          {/* Ask Duration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask how long symptoms have lasted</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask "How long have you been experiencing this?"
              </p>
            </div>
            <Switch
              checked={localConfig.ask_duration_of_symptoms ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_duration_of_symptoms", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Detection</CardTitle>
          <CardDescription>
            Configure how the agent handles potential medical emergencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detect Emergency Keywords */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Detect emergency keywords</Label>
              <p className="text-sm text-muted-foreground">
                Agent will recognize severe symptoms and escalate appropriately
              </p>
            </div>
            <Switch
              checked={localConfig.detect_emergency_keywords ?? true}
              onCheckedChange={(checked) => handleUpdate("detect_emergency_keywords", checked)}
            />
          </div>

          {/* Emergency Escalation Script */}
          {localConfig.detect_emergency_keywords && (
            <div className="space-y-2">
              <Label>Emergency escalation script</Label>
              <Textarea
                value={localConfig.emergency_escalation_script || ""}
                onChange={(e) => handleUpdate("emergency_escalation_script", e.target.value)}
                placeholder="This sounds like it may need immediate attention. I recommend calling 911 or going to the ER. Can I help you with anything else?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                What agent says when emergency keywords detected (chest pain, can't breathe, etc.)
              </p>
            </div>
          )}

          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-100 text-xs">
              <strong>Emergency keywords include:</strong> chest pain, difficulty breathing, severe
              bleeding, unconscious, stroke symptoms, severe allergic reaction, thoughts of
              self-harm. Agent will ALWAYS recommend 911 for these.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
