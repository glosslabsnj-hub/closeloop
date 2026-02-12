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
import { useFleetDrivers } from "@/hooks/useFleetDrivers";
import { CustomerSearchCombobox } from "./CustomerSearchCombobox";
import { useCustomerVehicles, type CustomerVehicle } from "@/hooks/useCustomerVehicles";
import type { Customer } from "@/hooks/useCustomers";

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
  const { activeDrivers } = useFleetDrivers();

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<JobPriority>("normal");
  const [notes, setNotes] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  const { vehicles } = useCustomerVehicles(customerId);

  const reset = () => {
    setTitle("");
    setCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedVehicleId("");
    setAssignedTo("");
    setPriority("normal");
    setNotes("");
    setEstimatedCompletion("");
    setServices([]);
    setNewServiceTitle("");
    setMetadata({});
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    if (customer) {
      setCustomerId(customer.id);
      setCustomerName(customer.full_name);
      setCustomerPhone(customer.phone_e164 || "");
      setSelectedVehicleId("");
    } else {
      setCustomerId(null);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedVehicleId("");
    }
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
        customer_id: customerId || undefined,
        priority,
        notes: notes.trim() || undefined,
        estimated_completion: estimatedCompletion || undefined,
        metadata_json: {
          ...(Object.keys(metadata).length > 0 ? metadata : {}),
          ...(selectedVehicleId ? { vehicle_id: selectedVehicleId } : {}),
          ...(assignedTo ? { assigned_to: assignedTo } : {}),
        },
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

  const formatVehicleLabel = (v: CustomerVehicle) =>
    [v.year, v.make, v.model, v.color].filter(Boolean).join(" ") || "Unnamed Vehicle";

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

          {/* Customer Search */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <CustomerSearchCombobox
              value={customerId}
              onSelect={handleCustomerSelect}
            />
          </div>

          {/* Manual name/phone (shown when no customer selected, or editable) */}
          {!customerId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer-name">Name</Label>
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
          )}

          {/* Vehicle picker (only when customer selected and has vehicles) */}
          {customerId && vehicles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {formatVehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Assigned To + Priority */}
          <div className="grid grid-cols-2 gap-3">
            {activeDrivers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Est. Completion */}
          <div className="space-y-1.5">
            <Label htmlFor="est-completion">Est. Completion</Label>
            <Input
              id="est-completion"
              type="datetime-local"
              value={estimatedCompletion}
              onChange={(e) => setEstimatedCompletion(e.target.value)}
            />
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
