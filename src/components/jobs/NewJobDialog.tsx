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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useActiveJobs, type JobPriority } from "@/hooks/useActiveJobs";
import { useJobLabels } from "@/hooks/useJobLabels";

interface NewJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ServiceEntry {
  id: string;
  title: string;
}

export function NewJobDialog({ open, onOpenChange }: NewJobDialogProps) {
  const { createJob } = useActiveJobs();
  const labels = useJobLabels();

  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState<JobPriority>("normal");
  const [notes, setNotes] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  const reset = () => {
    setTitle("");
    setCustomerName("");
    setCustomerPhone("");
    setPriority("normal");
    setNotes("");
    setEstimatedCompletion("");
    setServices([]);
    setNewServiceTitle("");
    setMetadata({});
  };

  const handleAddService = () => {
    const trimmed = newServiceTitle.trim();
    if (!trimmed) return;
    setServices((prev) => [...prev, { id: crypto.randomUUID(), title: trimmed }]);
    setNewServiceTitle("");
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    createJob.mutate(
      {
        title: title.trim(),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        priority,
        notes: notes.trim() || undefined,
        estimated_completion: estimatedCompletion || undefined,
        metadata_json: Object.keys(metadata).length > 0 ? metadata : undefined,
        services: services.map((s) => ({ title: s.title })),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {labels.singularJob}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="job-title">{labels.singularJob} Title *</Label>
            <Input
              id="job-title"
              placeholder={`e.g. "2019 Honda Civic Full Service"`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                placeholder="+1 (555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Metadata fields (industry-specific) */}
          {labels.metadataFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {labels.metadataFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`meta-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`meta-${field.key}`}
                    placeholder={field.placeholder}
                    value={metadata[field.key] || ""}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Priority & Est. Completion */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-completion">Est. Completion</Label>
              <Input
                id="est-completion"
                type="datetime-local"
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>{labels.serviceSteps}</Label>
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Input value={s.title} readOnly className="h-8 text-sm" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleRemoveService(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder={`Add ${labels.serviceStep.toLowerCase()}...`}
                value={newServiceTitle}
                onChange={(e) => setNewServiceTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddService())}
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddService}
                disabled={!newServiceTitle.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createJob.isPending}
          >
            {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create {labels.singularJob}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
