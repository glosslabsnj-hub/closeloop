import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SequenceStep } from "@/hooks/useRecoverySettings";

interface StepEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: SequenceStep | null;
  stepOrder: number;
  sequenceId: string;
  onSave: (step: Partial<SequenceStep> & { id?: string }) => void;
}

const MESSAGE_TOKENS = [
  { key: "{{customer_name}}", label: "Full Name" },
  { key: "{{customer_first_name}}", label: "First Name" },
  { key: "{{business_name}}", label: "Business" },
  { key: "{{business_phone}}", label: "Phone" },
  { key: "{{service_interest}}", label: "Service" },
  { key: "{{original_objection}}", label: "Objection" },
  { key: "{{offer_code}}", label: "Offer Code" },
  { key: "{{offer_description}}", label: "Offer" },
  { key: "{{booking_link}}", label: "Book Link" },
];

type DelayUnit = "minutes" | "hours" | "days";

function minutesToDelayValue(minutes: number): { value: number; unit: DelayUnit } {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: "days" };
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: "hours" };
  }
  return { value: minutes, unit: "minutes" };
}

function delayValueToMinutes(value: number, unit: DelayUnit): number {
  switch (unit) {
    case "days":
      return value * 1440;
    case "hours":
      return value * 60;
    default:
      return value;
  }
}

export function StepEditorModal({
  open,
  onOpenChange,
  step,
  stepOrder,
  sequenceId,
  onSave,
}: StepEditorModalProps) {
  const [actionType, setActionType] = useState("sms");
  const [delayValue, setDelayValue] = useState(1);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("hours");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [aiCallScriptHints, setAiCallScriptHints] = useState("");
  const [skipIfResponded, setSkipIfResponded] = useState(true);
  const [skipIfBooked, setSkipIfBooked] = useState(true);

  useEffect(() => {
    if (step) {
      setActionType(step.action_type);
      const { value, unit } = minutesToDelayValue(step.delay_minutes);
      setDelayValue(value);
      setDelayUnit(unit);
      setMessageTemplate(step.message_template || "");
      setAiCallScriptHints(step.ai_call_script_hints || "");
      setSkipIfResponded(step.skip_if_responded ?? true);
      setSkipIfBooked(step.skip_if_booked ?? true);
    } else {
      // Reset to defaults for new step
      setActionType("sms");
      setDelayValue(1);
      setDelayUnit("hours");
      setMessageTemplate("");
      setAiCallScriptHints("");
      setSkipIfResponded(true);
      setSkipIfBooked(true);
    }
  }, [step, open]);

  const insertToken = (token: string) => {
    setMessageTemplate((prev) => prev + token);
  };

  const handleSave = () => {
    onSave({
      id: step?.id,
      sequence_id: sequenceId,
      step_order: stepOrder,
      action_type: actionType,
      delay_minutes: delayValueToMinutes(delayValue, delayUnit),
      message_template: messageTemplate || null,
      ai_call_script_hints: aiCallScriptHints || null,
      skip_if_responded: skipIfResponded,
      skip_if_booked: skipIfBooked,
    });
    onOpenChange(false);
  };

  const resolvePreview = (template: string): string => {
    return template
      .replace(/\{\{customer_name\}\}/g, "John Smith")
      .replace(/\{\{customer_first_name\}\}/g, "John")
      .replace(/\{\{business_name\}\}/g, "ABC Services")
      .replace(/\{\{business_phone\}\}/g, "(555) 123-4567")
      .replace(/\{\{service_interest\}\}/g, "AC Repair")
      .replace(/\{\{original_objection\}\}/g, "needs to check with spouse")
      .replace(/\{\{offer_code\}\}/g, "COMEBACK10")
      .replace(/\{\{offer_description\}\}/g, "10% off")
      .replace(/\{\{booking_link\}\}/g, "https://book.example.com");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step ? `Edit Step ${stepOrder}` : `Add Step ${stepOrder}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Type */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="ai_call">AI Call</SelectItem>
                <SelectItem value="internal_task">Internal Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delay */}
          <div className="space-y-2">
            <Label>Delay after previous step</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={delayValue}
                onChange={(e) => setDelayValue(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as DelayUnit)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message (for SMS/Email) */}
          {["sms", "email"].includes(actionType) && (
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={4}
                placeholder="Enter your message template..."
              />
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Insert token:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {MESSAGE_TOKENS.map((token) => (
                    <Badge
                      key={token.key}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-muted"
                      onClick={() => insertToken(token.key)}
                    >
                      {token.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {messageTemplate && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                  <Label className="text-xs text-muted-foreground">Preview:</Label>
                  <p className="text-sm mt-1">{resolvePreview(messageTemplate)}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Call settings */}
          {actionType === "ai_call" && (
            <div className="space-y-2">
              <Label>Script Hints (what the AI should know)</Label>
              <Textarea
                value={aiCallScriptHints}
                onChange={(e) => setAiCallScriptHints(e.target.value)}
                placeholder="Customer called about {{service_interest}}. They mentioned: {{original_objection}}."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These hints help the AI understand context for the call.
              </p>
            </div>
          )}

          {/* Internal Task settings */}
          {actionType === "internal_task" && (
            <div className="space-y-2">
              <Label>Task Description</Label>
              <Textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Follow up with {{customer_name}} about {{service_interest}}"
                rows={3}
              />
            </div>
          )}

          {/* Skip conditions */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Skip Conditions</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="skip-responded"
                checked={skipIfResponded}
                onCheckedChange={(v) => setSkipIfResponded(v as boolean)}
              />
              <label htmlFor="skip-responded" className="text-sm cursor-pointer">
                Skip if customer already responded
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="skip-booked"
                checked={skipIfBooked}
                onCheckedChange={(v) => setSkipIfBooked(v as boolean)}
              />
              <label htmlFor="skip-booked" className="text-sm cursor-pointer">
                Skip if customer already booked
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
