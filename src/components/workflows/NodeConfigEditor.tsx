import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { NODE_TYPE_METADATA, type WorkflowNode } from "@/types/workflow";
import { VariablePicker } from "./VariablePicker";

interface NodeConfigEditorProps {
  node: WorkflowNode;
  open: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  availableVariables: string[];
}

export function NodeConfigEditor({
  node,
  open,
  onClose,
  onSave,
  availableVariables,
}: NodeConfigEditorProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  
  const meta = NODE_TYPE_METADATA[node.node_type];

  useEffect(() => {
    setConfig(node.config as Record<string, any>);
  }, [node]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const insertVariable = (field: string, variable: string) => {
    const current = config[field] || "";
    updateField(field, current + `{{${variable}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{meta?.icon}</span>
            Configure: {meta?.label}
          </DialogTitle>
          <DialogDescription>{meta?.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* SMS Configuration */}
          {node.node_type === "notify_sms" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>To (Phone Number)</Label>
                  <VariablePicker
                    variables={availableVariables.filter(v => v.includes("phone"))}
                    onSelect={(v) => insertVariable("to", v)}
                  />
                </div>
                <Input
                  value={config.to || ""}
                  onChange={(e) => updateField("to", e.target.value)}
                  placeholder="{{customer_phone}} or +1234567890"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message</Label>
                  <VariablePicker
                    variables={availableVariables}
                    onSelect={(v) => insertVariable("message", v)}
                  />
                </div>
                <Textarea
                  value={config.message || ""}
                  onChange={(e) => updateField("message", e.target.value)}
                  placeholder="Your order #{{order_number}} is confirmed!"
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Email Configuration */}
          {node.node_type === "notify_email" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>To (Email)</Label>
                  <VariablePicker
                    variables={availableVariables.filter(v => v.includes("email"))}
                    onSelect={(v) => insertVariable("to", v)}
                  />
                </div>
                <Input
                  value={config.to || ""}
                  onChange={(e) => updateField("to", e.target.value)}
                  placeholder="{{customer_email}}"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject</Label>
                  <VariablePicker
                    variables={availableVariables}
                    onSelect={(v) => insertVariable("subject", v)}
                  />
                </div>
                <Input
                  value={config.subject || ""}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="Order Confirmation #{{order_number}}"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Body</Label>
                  <VariablePicker
                    variables={availableVariables}
                    onSelect={(v) => insertVariable("body", v)}
                  />
                </div>
                <Textarea
                  value={config.body || ""}
                  onChange={(e) => updateField("body", e.target.value)}
                  placeholder="Hello {{customer_name}}, your order has been confirmed..."
                  rows={6}
                />
              </div>
            </>
          )}

          {/* Delay Configuration */}
          {node.node_type === "delay" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.minutes || ""}
                  onChange={(e) => updateField("minutes", parseInt(e.target.value) || 0)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label>Or Hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.hours || ""}
                  onChange={(e) => updateField("hours", parseInt(e.target.value) || 0)}
                  placeholder="1"
                />
              </div>
            </div>
          )}

          {/* Webhook Configuration */}
          {node.node_type === "webhook_push" && (
            <>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={config.url || ""}
                  onChange={(e) => updateField("url", e.target.value)}
                  placeholder="https://your-api.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={config.method || "POST"}
                  onValueChange={(v) => updateField("method", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Print Ticket Configuration */}
          {node.node_type === "print_ticket" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={config.format || "thermal"}
                  onValueChange={(v) => updateField("format", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal">Thermal (Receipt)</SelectItem>
                    <SelectItem value="full">Full Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Copies</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={config.copies || 1}
                  onChange={(e) => updateField("copies", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          )}

          {/* Set Field Configuration */}
          {node.node_type === "set_field" && (
            <>
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input
                  value={config.entity_field || ""}
                  onChange={(e) => updateField("entity_field", e.target.value)}
                  placeholder="status"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Value</Label>
                  <VariablePicker
                    variables={availableVariables}
                    onSelect={(v) => insertVariable("value", v)}
                  />
                </div>
                <Input
                  value={config.value || ""}
                  onChange={(e) => updateField("value", e.target.value)}
                  placeholder="confirmed"
                />
              </div>
            </>
          )}

          {/* Branch Configuration */}
          {node.node_type === "branch" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Branching logic allows you to route the workflow based on conditions.
                This is an advanced feature.
              </p>
              <div className="space-y-2">
                <Label>Condition Field</Label>
                <Select
                  value={config.field || ""}
                  onValueChange={(v) => updateField("field", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVariables.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={config.op || "eq"}
                  onValueChange={(v) => updateField("op", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">Equals</SelectItem>
                    <SelectItem value="neq">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="gt">Greater Than</SelectItem>
                    <SelectItem value="lt">Less Than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={config.check_value || ""}
                  onChange={(e) => updateField("check_value", e.target.value)}
                  placeholder="Value to compare"
                />
              </div>
            </div>
          )}

          {/* Default for unsupported types */}
          {!["notify_sms", "notify_email", "delay", "webhook_push", "print_ticket", "set_field", "branch"].includes(node.node_type) && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Configuration for this node type is coming soon.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
