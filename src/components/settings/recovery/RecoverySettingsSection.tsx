import { useState } from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useRecoverySettings, type SequenceStep } from "@/hooks/useRecoverySettings";
import { StepEditorModal } from "./StepEditorModal";

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00", "22:00", "23:00",
];

const ACTION_ICONS: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  email: Mail,
  ai_call: Phone,
  internal_task: ClipboardList,
};

const ACTION_LABELS: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  ai_call: "AI Call",
  internal_task: "Internal Task",
};

function formatDelay(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `After ${days} day${days > 1 ? "s" : ""}`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `After ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `After ${minutes} minute${minutes > 1 ? "s" : ""}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function RecoverySettingsSection() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  const {
    settings,
    sequence,
    isLoading,
    saveSettings,
    saveStep,
    deleteStep,
    createSequence,
    isSaving,
  } = useRecoverySettings(tenantId);

  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [addingNewStep, setAddingNewStep] = useState(false);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);

  const handleToggle = (key: string, value: boolean) => {
    saveSettings({ [key]: value });
  };

  const handleQuietDayChange = (day: string, checked: boolean) => {
    const current = settings?.quiet_days || [];
    const updated = checked
      ? [...current, day]
      : current.filter((d) => d !== day);
    saveSettings({ quiet_days: updated });
  };

  const handleEditStep = (step: SequenceStep) => {
    setEditingStep(step);
    setAddingNewStep(false);
    setStepModalOpen(true);
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setAddingNewStep(true);
    setStepModalOpen(true);
  };

  const handleSaveStep = (step: Partial<SequenceStep> & { id?: string }) => {
    saveStep(step);
    setStepModalOpen(false);
  };

  const handleDeleteStep = () => {
    if (deleteStepId) {
      deleteStep(deleteStepId);
      setDeleteStepId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const newStepOrder = (sequence?.steps?.length || 0) + 1;

  return (
    <div className="space-y-6">
      {/* Enable Lead Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enable Lead Recovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatically follow up with leads</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, Voxly will follow up with callers who don't book.
              </p>
            </div>
            <Switch
              checked={settings?.recovery_enabled ?? false}
              onCheckedChange={(v) => handleToggle("recovery_enabled", v)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Auto-start recovery after calls</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start recovery for qualifying calls
              </p>
            </div>
            <Switch
              checked={settings?.auto_start_recovery ?? true}
              onCheckedChange={(v) => handleToggle("auto_start_recovery", v)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Respect business hours</Label>
              <p className="text-sm text-muted-foreground">
                Only send messages during your configured business hours
              </p>
            </div>
            <Switch
              checked={settings?.respect_business_hours ?? true}
              onCheckedChange={(v) => handleToggle("respect_business_hours", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recovery Sequence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recovery Sequence</CardTitle>
              <CardDescription>
                Active Sequence: {sequence?.name || "None"}
              </CardDescription>
            </div>
            {!sequence && (
              <Button onClick={() => createSequence()} disabled={isSaving}>
                <Plus className="w-4 h-4 mr-2" /> Create Default Sequence
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sequence?.steps && sequence.steps.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {sequence.steps.map((step) => {
                const Icon = ACTION_ICONS[step.action_type] || MessageSquare;
                return (
                  <div
                    key={step.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Step {step.step_order}: {ACTION_LABELS[step.action_type]}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatDelay(step.delay_minutes)}
                        </Badge>
                      </div>
                      {step.message_template && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          "{step.message_template}"
                        </p>
                      )}
                      {step.ai_call_script_hints && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          Hints: {step.ai_call_script_hints}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditStep(step)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteStepId(step.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : sequence ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No steps configured</p>
              <p className="text-sm">Add steps to define your recovery sequence</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No sequence configured</p>
              <p className="text-sm">Create a sequence to start recovering leads</p>
            </div>
          )}

          {sequence && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleAddStep}>
                <Plus className="w-4 h-4 mr-2" /> Add Step
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timing & Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timing & Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiet Hours */}
          <div className="space-y-2">
            <Label>Quiet Hours (don't send messages)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From</span>
              <Select
                value={settings?.quiet_hours_start || "21:00"}
                onValueChange={(v) => saveSettings({ quiet_hours_start: v })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTime(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">to</span>
              <Select
                value={settings?.quiet_hours_end || "08:00"}
                onValueChange={(v) => saveSettings({ quiet_hours_end: v })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTime(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiet Days */}
          <div className="space-y-2">
            <Label>Quiet Days</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sunday"
                  checked={settings?.quiet_days?.includes("sunday") ?? true}
                  onCheckedChange={(v) => handleQuietDayChange("sunday", v as boolean)}
                />
                <label htmlFor="sunday" className="text-sm cursor-pointer">
                  Sunday
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="saturday"
                  checked={settings?.quiet_days?.includes("saturday") ?? false}
                  onCheckedChange={(v) => handleQuietDayChange("saturday", v as boolean)}
                />
                <label htmlFor="saturday" className="text-sm cursor-pointer">
                  Saturday
                </label>
              </div>
            </div>
          </div>

          {/* Max Attempts */}
          <div className="space-y-2">
            <Label>Maximum attempts per lead</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={50}
                value={settings?.max_attempts_per_lead || 10}
                onChange={(e) => saveSettings({ max_attempts_per_lead: parseInt(e.target.value) || 10 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                attempts before marking as dormant
              </span>
            </div>
          </div>

          {/* Max Campaigns per Day */}
          <div className="space-y-2">
            <Label>Maximum campaigns per day</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={500}
                value={settings?.max_campaigns_per_day || 50}
                onChange={(e) => saveSettings({ max_campaigns_per_day: parseInt(e.target.value) || 50 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                new campaigns started per day
              </span>
            </div>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label>Cooldown period</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={settings?.cooldown_days || 30}
                onChange={(e) => saveSettings({ cooldown_days: parseInt(e.target.value) || 30 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                days before re-recovering the same lead
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Outbound Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Outbound Calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI callback</Label>
              <p className="text-sm text-muted-foreground">
                Allow Voxly to call leads back automatically
              </p>
            </div>
            <Switch
              checked={settings?.ai_calls_enabled ?? false}
              onCheckedChange={(v) => handleToggle("ai_calls_enabled", v)}
            />
          </div>

          {!settings?.ai_calls_enabled && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <p className="text-sm text-warning-foreground">
                Requires additional setup. Contact support to enable AI outbound calling.
              </p>
            </div>
          )}

          {settings?.ai_calls_enabled && (
            <div className="space-y-2 pt-2 border-t">
              <Label>AI call hours</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From</span>
                <Select
                  value={settings?.ai_call_hours_start || "09:00"}
                  onValueChange={(v) => saveSettings({ ai_call_hours_start: v })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">to</span>
                <Select
                  value={settings?.ai_call_hours_end || "18:00"}
                  onValueChange={(v) => saveSettings({ ai_call_hours_end: v })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Offer Code</Label>
            <Input
              value={settings?.default_offer_code || ""}
              onChange={(e) => saveSettings({ default_offer_code: e.target.value })}
              placeholder="COMEBACK10"
            />
          </div>

          <div className="space-y-2">
            <Label>Offer Description (used in final messages)</Label>
            <Input
              value={settings?.default_offer_description || ""}
              onChange={(e) => saveSettings({ default_offer_description: e.target.value })}
              placeholder="10% off your service"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-lg">💡</span>
            <p className="text-sm text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{"{{offer_code}}"}</code> and{" "}
              <code className="bg-muted px-1 rounded">{"{{offer_description}}"}</code> in your
              messages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Notify me when a lead responds</Label>
            <Switch
              checked={settings?.notify_on_response ?? true}
              onCheckedChange={(v) => handleToggle("notify_on_response", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Notify me when a lead converts</Label>
            <Switch
              checked={settings?.notify_on_conversion ?? true}
              onCheckedChange={(v) => handleToggle("notify_on_conversion", v)}
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label>Notification email (optional)</Label>
            <Input
              type="email"
              value={settings?.notification_email || ""}
              onChange={(e) => saveSettings({ notification_email: e.target.value })}
              placeholder="owner@business.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Notification SMS (optional)</Label>
            <Input
              type="tel"
              value={settings?.notification_sms || ""}
              onChange={(e) => saveSettings({ notification_sms: e.target.value })}
              placeholder="+1 555-123-4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Editor Modal */}
      {sequence && (
        <StepEditorModal
          open={stepModalOpen}
          onOpenChange={setStepModalOpen}
          step={editingStep}
          stepOrder={addingNewStep ? newStepOrder : editingStep?.step_order || 1}
          sequenceId={sequence.id}
          onSave={handleSaveStep}
        />
      )}

      {/* Delete Step Confirmation */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
