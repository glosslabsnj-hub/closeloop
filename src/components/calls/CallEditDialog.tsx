import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: {
    id: string;
    caller_phone: string | null;
    outcome: string | null;
    summary: string | null;
    context_json: Record<string, unknown> | null;
  };
  onSave: (updates: {
    outcome: string | null;
    summary: string | null;
    context_json: Record<string, unknown>;
  }) => Promise<void>;
}

export function CallEditDialog({ open, onOpenChange, call, onSave }: CallEditDialogProps) {
  const [customerName, setCustomerName] = useState(
    (call.context_json?.customer_name as string) ||
    (call.context_json?.name as string) ||
    ""
  );
  const [serviceRequested, setServiceRequested] = useState(
    (call.context_json?.service_requested as string) ||
    (call.context_json?.service as string) ||
    ""
  );
  const [outcome, setOutcome] = useState(call.outcome || "lead_captured");
  const [summary, setSummary] = useState(call.summary || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedContext = {
        ...call.context_json,
        customer_name: customerName || undefined,
        service_requested: serviceRequested || undefined,
        booking_confirmed: outcome === "booked",
      };

      await onSave({
        outcome,
        summary: summary || null,
        context_json: updatedContext,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Call Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Phone (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Phone Number</Label>
            <Input value={call.caller_phone || "Unknown"} disabled className="bg-muted" />
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              placeholder="e.g., John Smith"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Service Requested */}
          <div className="space-y-2">
            <Label htmlFor="serviceRequested">Service Requested</Label>
            <Input
              id="serviceRequested"
              placeholder="e.g., Tow, Jump Start, Flat Tire"
              value={serviceRequested}
              onChange={(e) => setServiceRequested(e.target.value)}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome">Status / Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booked">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Booked
                  </span>
                </SelectItem>
                <SelectItem value="followup">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Follow Up Needed
                  </span>
                </SelectItem>
                <SelectItem value="lead_captured">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Lead Captured
                  </span>
                </SelectItem>
                <SelectItem value="info_provided">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Info Provided
                  </span>
                </SelectItem>
                <SelectItem value="lost">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    No Book / Lost
                  </span>
                </SelectItem>
                <SelectItem value="escalated">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Escalated
                  </span>
                </SelectItem>
                <SelectItem value="abandoned">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Abandoned
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">AI Summary / Notes</Label>
            <Textarea
              id="summary"
              placeholder="Summary of the call or notes..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
