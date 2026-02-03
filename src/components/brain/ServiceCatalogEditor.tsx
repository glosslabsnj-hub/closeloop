import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Plus, Trash2, Clock, DollarSign, Loader2, Info, Lightbulb, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { InlineUploadButton } from "./InlineUploadButton";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  deposit_amount: null,
  deposit_required: false,
};

export function ServiceCatalogEditor() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const queryClient = useQueryClient();

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [editingFormData, setEditingFormData] = useState<Record<string, ServiceFormData>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newServiceData, setNewServiceData] = useState<ServiceFormData>(defaultFormData);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote Required";
    if (!service.price_amount) return "Not Set";
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${service.price_amount}`;
  };

  const toggleService = (serviceId: string, service: any) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
    } else {
      setExpandedServiceId(serviceId);
      // Initialize form data for this service if not already done
      if (!editingFormData[serviceId]) {
        setEditingFormData(prev => ({
          ...prev,
          [serviceId]: {
            name: service.name,
            description: service.description || "",
            duration_minutes: service.duration_minutes,
            price_type: service.price_type,
            price_amount: service.price_amount ? Number(service.price_amount) : null,
            deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
            deposit_required: service.deposit_required || false,
          }
        }));
      }
    }
    // Close new service form if open
    setIsCreatingNew(false);
  };

  const updateFormField = (serviceId: string, field: keyof ServiceFormData, value: any) => {
    setEditingFormData(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      }
    }));
  };

  const handleSave = async (serviceId: string) => {
    if (!tenant?.id) return;
    const formData = editingFormData[serviceId];
    if (!formData || !formData.name.trim()) return;

    setSavingServiceId(serviceId);
    try {
      await updateService(serviceId, tenant.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        duration_minutes: formData.duration_minutes,
        price_type: formData.price_type,
        price_amount: formData.price_amount,
        deposit_amount: formData.deposit_amount,
        deposit_required: formData.deposit_required,
      });
      toast.success("Service updated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setExpandedServiceId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!tenant?.id || !newServiceData.name.trim()) return;

    setSavingServiceId("new");
    try {
      await createService(tenant.id, {
        name: newServiceData.name.trim(),
        description: newServiceData.description.trim() || undefined,
        duration_minutes: newServiceData.duration_minutes,
        price_type: newServiceData.price_type,
        price_amount: newServiceData.price_amount,
        deposit_amount: newServiceData.deposit_amount,
        deposit_required: newServiceData.deposit_required,
      });
      toast.success("Service created");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setIsCreatingNew(false);
      setNewServiceData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingService) return;

    try {
      await deleteService(deletingService.id, tenant.id);
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setDeleteDialogOpen(false);
      setDeletingService(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  const handleToggleActive = async (service: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenant?.id) return;

    try {
      await updateService(service.id, tenant.id, {
        is_active: !service.is_active,
      });
      toast.success(service.is_active ? "Service deactivated" : "Service activated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    }
  };

  const startCreatingNew = () => {
    setIsCreatingNew(true);
    setExpandedServiceId(null);
    setNewServiceData(defaultFormData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build AI quote preview from first service
  const firstService = services?.[0];
  const aiQuotePreview = firstService
    ? `Our ${firstService.name.toLowerCase()} ${
        firstService.price_type === "starting_at" 
          ? `starts at $${firstService.price_amount}` 
          : firstService.price_type === "quote_only"
          ? "requires a custom quote"
          : `is $${firstService.price_amount}`
      }${firstService.duration_minutes ? ` and takes about ${formatDuration(firstService.duration_minutes)}` : ""}.`
    : "I can tell you about our services and pricing.";

  // Inline form component for reuse
  const ServiceForm = ({ 
    formData, 
    onChange, 
    onSave, 
    onCancel, 
    isSaving,
    isNew = false 
  }: { 
    formData: ServiceFormData;
    onChange: (field: keyof ServiceFormData, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    isNew?: boolean;
  }) => (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Service Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Haircut, Oil Change, etc."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Duration (minutes)</Label>
          <Input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => onChange("duration_minutes", parseInt(e.target.value) || 60)}
            placeholder="60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="What's included in this service..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Price Type</Label>
          <Select
            value={formData.price_type}
            onValueChange={(v) => onChange("price_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Exact Price</SelectItem>
              <SelectItem value="starting_at">Starting At</SelectItem>
              <SelectItem value="quote_only">Needs Quote</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.price_type === "fixed" && "AI will quote this exact price"}
            {formData.price_type === "starting_at" && "AI will say 'starting at...'"}
            {formData.price_type === "quote_only" && "AI will offer to provide a quote"}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price_amount ?? ""}
            onChange={(e) => onChange("price_amount", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="150.00"
            disabled={formData.price_type === "quote_only"}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.deposit_required}
            onCheckedChange={(checked) => onChange("deposit_required", checked)}
          />
          <Label className="text-sm">Require deposit</Label>
        </div>
        {formData.deposit_required && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Amount:</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.deposit_amount ?? ""}
              onChange={(e) => onChange("deposit_amount", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="50.00"
              className="w-24 h-8"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !formData.name.trim()}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          {isNew ? "Add Service" : "Save Changes"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Your services are what your AI assistant uses to answer pricing questions and book appointments. 
              Each service needs a <strong>name</strong>, <strong>duration</strong>, and <strong>price</strong>. 
              The AI will use this to help customers understand what you offer.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Click on any service to expand and edit it directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {services && services.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
              <p className="text-sm italic">"{aiQuotePreview}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                The AI uses your service catalog to provide accurate pricing and duration info
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Service Catalog</h3>
          <p className="text-sm text-muted-foreground">
            {services?.length 
              ? `${services.length} service${services.length !== 1 ? 's' : ''} • Click to expand and edit`
              : "Add your services so the AI can quote prices and book appointments"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InlineUploadButton 
            contentType="services" 
            variant="compact"
            onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["services"] })}
          />
          <Button onClick={startCreatingNew} disabled={isCreatingNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* New Service Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">New Service</span>
          </div>
          <ServiceForm
            formData={newServiceData}
            onChange={(field, value) => setNewServiceData(prev => ({ ...prev, [field]: value }))}
            onSave={handleCreateNew}
            onCancel={() => {
              setIsCreatingNew(false);
              setNewServiceData(defaultFormData);
            }}
            isSaving={savingServiceId === "new"}
            isNew
          />
        </Card>
      )}

      {/* Services List */}
      {services && services.length > 0 ? (
        <div className="space-y-2">
          {services.map((service) => {
            const isExpanded = expandedServiceId === service.id;
            const formData = editingFormData[service.id];

            return (
              <Collapsible
                key={service.id}
                open={isExpanded}
                onOpenChange={() => toggleService(service.id, service)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{service.name}</span>
                            {!service.is_active && (
                              <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium">{formatPrice(service)}</span>
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Clock className="h-3 w-3" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingService(service);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {formData && (
                      <ServiceForm
                        formData={formData}
                        onChange={(field, value) => updateFormField(service.id, field, value)}
                        onSave={() => handleSave(service.id)}
                        onCancel={() => setExpandedServiceId(null)}
                        isSaving={savingServiceId === service.id}
                      />
                    )}
                    <div className="px-4 py-2 border-t bg-muted/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleActive(service, { stopPropagation: () => {} } as any)}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {service.is_active ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : !isCreatingNew && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">No services yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start by adding your most popular services. The AI will use these to answer pricing questions and help customers book.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <InlineUploadButton 
                  contentType="services"
                  onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["services"] })}
                />
                <span className="text-xs text-muted-foreground">or</span>
                <Button onClick={startCreatingNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Manually
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
