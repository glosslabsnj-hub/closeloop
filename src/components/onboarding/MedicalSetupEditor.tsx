import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Phone, FileText, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface MedicalSetupData {
  requireVerbalConsent: boolean;
  storeTranscripts: boolean;
  storeRecordings: boolean;
  retentionDays: number;
  urgentEscalationNumber: string;
  intakeTypes: string[];
  schedulingNotes: string;
  // HIPAA acknowledgment
  hipaaAcknowledged?: boolean;
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
      {/* HIPAA Acknowledgment Card */}
      <Card className={data.hipaaAcknowledged ? "border-success/50 bg-success/5" : "border-amber-500/50 bg-amber-500/5"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className={data.hipaaAcknowledged ? "h-5 w-5 text-success" : "h-5 w-5 text-amber-600"} />
            HIPAA Compliance Mode
          </CardTitle>
          <CardDescription>
            Your AI will operate under strict HIPAA guidelines to protect patient privacy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span>Call recordings are <strong>disabled by default</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span>Full transcripts are <strong>not stored</strong> — only structured intake data</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span>AI will <strong>never provide medical advice</strong> or diagnoses</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span>Urgent symptoms are <strong>immediately escalated</strong> to staff</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2 border-t">
            <Checkbox
              id="hipaa-ack"
              checked={data.hipaaAcknowledged || false}
              onCheckedChange={(checked) => update("hipaaAcknowledged", checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="hipaa-ack"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I understand and acknowledge HIPAA mode
              </label>
              <p className="text-xs text-muted-foreground">
                I confirm that I understand the privacy protections enabled for patient data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
