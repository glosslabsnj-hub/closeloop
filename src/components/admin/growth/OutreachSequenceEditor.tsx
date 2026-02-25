import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, Mail, MessageSquare, Clock, GitBranch, Loader2, ArrowLeft } from "lucide-react";
import {
  useOutreachSequences,
  useOutreachSequenceSteps,
  useCreateOutreachSequence,
  useUpdateOutreachSequence,
  useDeleteOutreachSequence,
  useSaveSequenceSteps,
  type OutreachSequence,
  type OutreachSequenceStep,
} from "@/hooks/useAdminOutreach";

const STEP_TYPE_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  wait: Clock,
  condition: GitBranch,
};

const STEP_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  wait: "Wait",
  condition: "Condition",
};

interface StepDraft {
  step_order: number;
  step_type: string;
  delay_hours: number;
  subject: string;
  message_template: string;
  use_ai_personalization: boolean;
  skip_if_responded: boolean;
  sequence_id: string;
}

export function OutreachSequenceEditor() {
  const { data: sequences, isLoading } = useOutreachSequences();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutreachSequence | null>(null);
  const createSeq = useCreateOutreachSequence();
  const updateSeq = useUpdateOutreachSequence();
  const deleteSeq = useDeleteOutreachSequence();

  const selected = sequences?.find((s) => s.id === selectedId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (selectedId && selected) {
    return (
      <StepEditor
        sequence={selected}
        onBack={() => setSelectedId(null)}
        onUpdateName={(name) => updateSeq.mutate({ id: selected.id, name })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Outreach Sequences</h3>
          <p className="text-xs text-muted-foreground">Multi-step email and SMS outreach templates</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            createSeq.mutate(
              { name: "New Sequence", target_type: "business" },
              { onSuccess: (data) => setSelectedId(data.id) }
            );
          }}
          disabled={createSeq.isPending}
        >
          <Plus className="h-4 w-4 mr-1" /> New Sequence
        </Button>
      </div>

      <div className="grid gap-2">
        {(sequences ?? []).map((seq) => (
          <Card
            key={seq.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setSelectedId(seq.id)}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{seq.name}</h4>
                  {seq.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{seq.target_type}</Badge>
                </div>
                {seq.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{seq.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(seq); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This will remove all steps and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteSeq.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StepEditor({ sequence, onBack, onUpdateName }: {
  sequence: OutreachSequence;
  onBack: () => void;
  onUpdateName: (name: string) => void;
}) {
  const { data: existingSteps, isLoading } = useOutreachSequenceSteps(sequence.id);
  const saveSteps = useSaveSequenceSteps();
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [name, setName] = useState(sequence.name);

  useEffect(() => {
    if (existingSteps) {
      setSteps(existingSteps.map((s) => ({
        step_order: s.step_order,
        step_type: s.step_type,
        delay_hours: s.delay_hours,
        subject: s.subject || "",
        message_template: s.message_template || "",
        use_ai_personalization: s.use_ai_personalization,
        skip_if_responded: s.skip_if_responded,
        sequence_id: sequence.id,
      })));
    }
  }, [existingSteps, sequence.id]);

  const addStep = (type: string) => {
    const newOrder = steps.length + 1;
    setSteps([...steps, {
      step_order: newOrder,
      step_type: type,
      delay_hours: type === "wait" ? 72 : 0,
      subject: "",
      message_template: "",
      use_ai_personalization: type === "email",
      skip_if_responded: true,
      sequence_id: sequence.id,
    }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }));
    setSteps(newSteps);
  };

  const updateStep = (index: number, updates: Partial<StepDraft>) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleSave = () => {
    if (name !== sequence.name) onUpdateName(name);
    saveSteps.mutate({ sequenceId: sequence.id, steps });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm font-semibold max-w-xs"
        />
        <Button size="sm" onClick={handleSave} disabled={saveSteps.isPending}>
          {saveSteps.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const Icon = STEP_TYPE_ICONS[step.step_type] || Clock;
          return (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    Step {step.step_order}: {STEP_TYPE_LABELS[step.step_type]}
                  </Badge>
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStep(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>

                {step.step_type === "wait" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Wait</Label>
                    <Input
                      type="number"
                      value={step.delay_hours}
                      onChange={(e) => updateStep(i, { delay_hours: Number(e.target.value) })}
                      className="h-7 text-xs w-20"
                    />
                    <span className="text-xs text-muted-foreground">hours ({Math.round(step.delay_hours / 24)}d)</span>
                  </div>
                )}

                {step.step_type === "email" && (
                  <>
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={step.subject}
                        onChange={(e) => updateStep(i, { subject: e.target.value })}
                        className="h-7 text-xs mt-1"
                        placeholder="Email subject with {{tokens}}"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        value={step.message_template}
                        onChange={(e) => updateStep(i, { message_template: e.target.value })}
                        className="text-xs mt-1 min-h-[80px]"
                        placeholder="Email body with {{business_name}}, {{reason_snippet}}, etc."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={step.use_ai_personalization}
                          onCheckedChange={(v) => updateStep(i, { use_ai_personalization: v })}
                        />
                        <Label className="text-xs">AI personalization</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={step.skip_if_responded}
                          onCheckedChange={(v) => updateStep(i, { skip_if_responded: v })}
                        />
                        <Label className="text-xs">Skip if responded</Label>
                      </div>
                    </div>
                  </>
                )}

                {step.step_type === "sms" && (
                  <>
                    <div>
                      <Label className="text-xs">Message</Label>
                      <Textarea
                        value={step.message_template}
                        onChange={(e) => updateStep(i, { message_template: e.target.value })}
                        className="text-xs mt-1 min-h-[60px]"
                        placeholder="SMS message with {{tokens}}"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={step.skip_if_responded}
                        onCheckedChange={(v) => updateStep(i, { skip_if_responded: v })}
                      />
                      <Label className="text-xs">Skip if responded</Label>
                    </div>
                  </>
                )}

                {step.step_type === "condition" && (
                  <p className="text-xs text-muted-foreground">
                    Skips remaining steps if the lead has responded.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Add step:</span>
        <Button size="sm" variant="outline" onClick={() => addStep("email")}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => addStep("sms")}>
          <MessageSquare className="h-3.5 w-3.5 mr-1" /> SMS
        </Button>
        <Button size="sm" variant="outline" onClick={() => addStep("wait")}>
          <Clock className="h-3.5 w-3.5 mr-1" /> Wait
        </Button>
        <Button size="sm" variant="outline" onClick={() => addStep("condition")}>
          <GitBranch className="h-3.5 w-3.5 mr-1" /> Condition
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Available tokens: {"{{business_name}}"}, {"{{from_name}}"}, {"{{reason_snippet}}"}, {"{{demo_link}}"}, {"{{trial_link}}"}
      </div>
    </div>
  );
}
