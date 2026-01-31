import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Phone, FileText, Clock, AlertTriangle } from "lucide-react";

export interface MedicalSetupData {
  requireVerbalConsent: boolean;
  storeTranscripts: boolean;
  storeRecordings: boolean;
  retentionDays: number;
  urgentEscalationNumber: string;
  intakeTypes: string[];
  schedulingNotes: string;
}

interface MedicalSetupEditorProps {
  data: MedicalSetupData;
  onChange: (data: MedicalSetupData) => void;
}

const intakeTypeOptions = [
  { id: "new_patient", label: "New Patient Intake" },
  { id: "follow_up", label: "Follow-up Appointment" },
  { id: "prescription_refill", label: "Prescription Refill Request" },
  { id: "appointment_request", label: "General Appointment Request" },
];

export function MedicalSetupEditor({ data, onChange }: MedicalSetupEditorProps) {
  const update = (field: keyof MedicalSetupData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleIntakeType = (typeId: string) => {
    const current = data.intakeTypes || [];
    if (current.includes(typeId)) {
      update("intakeTypes", current.filter(t => t !== typeId));
    } else {
      update("intakeTypes", [...current, typeId]);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/50 bg-amber-500/5">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">HIPAA Mode Active</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Your AI will operate under strict HIPAA guidelines. Full call recordings and transcripts 
          are disabled by default. Only structured intake data and summaries are stored.
        </AlertDescription>
      </Alert>

      {/* Privacy Controls */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy & Data Controls
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require Verbal Consent</Label>
              <p className="text-sm text-muted-foreground">
                AI will ask for verbal consent before proceeding with intake
              </p>
            </div>
            <Switch
              checked={data.requireVerbalConsent}
              onCheckedChange={(v) => update("requireVerbalConsent", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Store Full Transcripts</Label>
              <p className="text-sm text-muted-foreground text-amber-600">
                ⚠️ Enabling increases PHI exposure
              </p>
            </div>
            <Switch
              checked={data.storeTranscripts}
              onCheckedChange={(v) => update("storeTranscripts", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Store Call Recordings</Label>
              <p className="text-sm text-muted-foreground text-amber-600">
                ⚠️ Enabling increases PHI exposure
              </p>
            </div>
            <Switch
              checked={data.storeRecordings}
              onCheckedChange={(v) => update("storeRecordings", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Retention (days)</Label>
            <Input
              type="number"
              value={data.retentionDays}
              onChange={(e) => update("retentionDays", parseInt(e.target.value) || 30)}
              min={7}
              max={365}
            />
            <p className="text-xs text-muted-foreground">
              Call data older than this will be automatically purged
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Escalation */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Urgent Escalation
          </h4>

          <div className="space-y-2">
            <Label>Emergency Escalation Number</Label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={data.urgentEscalationNumber}
              onChange={(e) => update("urgentEscalationNumber", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              AI will transfer urgent medical situations to this number
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Intake Types */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Intake Types
          </h4>
          <p className="text-sm text-muted-foreground">
            Select which types of intake requests the AI should handle
          </p>

          <div className="space-y-3">
            {intakeTypeOptions.map((option) => (
              <div key={option.id} className="flex items-center justify-between">
                <Label>{option.label}</Label>
                <Switch
                  checked={(data.intakeTypes || []).includes(option.id)}
                  onCheckedChange={() => toggleIntakeType(option.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Scheduling Notes for AI
        </Label>
        <Textarea
          placeholder="E.g., 'New patient appointments are 45 minutes, follow-ups are 15 minutes. We don't schedule same-day appointments.'"
          value={data.schedulingNotes}
          onChange={(e) => update("schedulingNotes", e.target.value)}
          rows={3}
        />
      </div>

      {/* AI Guardrails Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Medical Guardrails</AlertTitle>
        <AlertDescription>
          The AI will never provide medical diagnoses, treatment recommendations, or medication advice. 
          All urgent situations will be escalated to staff or emergency services.
        </AlertDescription>
      </Alert>
    </div>
  );
}
