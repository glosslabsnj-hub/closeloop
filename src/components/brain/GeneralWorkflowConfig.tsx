import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGeneralWorkflowConfig, GeneralWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GeneralWorkflowConfig() {
  const { config, isLoading, update, isUpdating } = useGeneralWorkflowConfig();
  const [localConfig, setLocalConfig] = useState<Partial<GeneralWorkflowConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleUpdate = (field: keyof GeneralWorkflowConfig, value: any) => {
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

      {/* Callback Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Callback Management</CardTitle>
          <CardDescription>
            Configure how the agent handles callback requests and lead capture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ask Best Time */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask for best time to call back</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask "When's a good time to reach you?"
              </p>
            </div>
            <Switch
              checked={localConfig.ask_best_time_to_call ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_best_time_to_call", checked)}
            />
          </div>

          {/* Ask Callback Reason */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask reason for callback</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask "What should I let them know this is regarding?"
              </p>
            </div>
            <Switch
              checked={localConfig.ask_callback_reason ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_callback_reason", checked)}
            />
          </div>

          {/* Callback Confirmation Script */}
          <div className="space-y-2">
            <Label>Callback confirmation script</Label>
            <Textarea
              value={localConfig.callback_confirmation_script || ""}
              onChange={(e) => handleUpdate("callback_confirmation_script", e.target.value)}
              placeholder="I'll have someone call you back at {{callback_time}}"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{"}
              {"{"}callback_time{"}"}{"}"}to insert when they'll be called
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unknown Question Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Unknown Question Handling</CardTitle>
          <CardDescription>
            Configure how the agent responds to questions it can't answer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Escalate Unknown */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Escalate unknown questions to callback</Label>
              <p className="text-sm text-muted-foreground">
                Agent will offer callback instead of guessing or making up answers
              </p>
            </div>
            <Switch
              checked={localConfig.escalate_unknown_questions ?? true}
              onCheckedChange={(checked) => handleUpdate("escalate_unknown_questions", checked)}
            />
          </div>

          {/* Unknown Question Script */}
          {localConfig.escalate_unknown_questions && (
            <div className="space-y-2">
              <Label>Unknown question script</Label>
              <Textarea
                value={localConfig.unknown_question_script || ""}
                onChange={(e) => handleUpdate("unknown_question_script", e.target.value)}
                placeholder="That's a great question - let me have someone who can give you the details call you back"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                What agent says when it doesn't know the answer
              </p>
            </div>
          )}

          {!localConfig.escalate_unknown_questions && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                <strong>Warning:</strong> When disabled, the agent will attempt to answer all
                questions from its knowledge base. This may result in inaccurate responses if the
                information isn't in the Business Brain.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>General Mode:</strong> This workflow is used for businesses that primarily capture
          leads and schedule callbacks rather than handling transactions directly. It's ideal for
          sales, consultations, and information requests.
        </AlertDescription>
      </Alert>
    </div>
  );
}
