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
import { Plus, Trash2, Clock, DollarSign, Loader2, Info, Lightbulb, ChevronDown, ChevronRight, Check, X, ClipboardPaste, FileSpreadsheet } from "lucide-react";
import { InlineUploadButton } from "./InlineUploadButton";
import { PasteFromPOSDialog } from "./PasteFromPOSDialog";
import { ServiceCSVImportDialog } from "./ServiceCSVImportDialog";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { invalidateBrainQueries } from "@/lib/brain/invalidateBrainQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getServiceExamples, getSlugServiceExamples, COMPLEXITY_HINTS, PRICE_FACTOR_HINTS } from "@/lib/industryExamples";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { QuotingBehaviorGuidance } from "@/components/brain/guidance/QuotingBehaviorGuidance";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
  complexity: "simple" | "complex";
  price_factors: string;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  deposit_amount: null,
  deposit_required: false,
  complexity: "simple",
  price_factors: "",
};

// Extracted outside ServiceCatalogEditor to prevent focus loss on re-render
function ServiceForm({ 
  formData, 
  onChange, 
  onSave, 
  onCancel, 
  isSaving,
  isNew = false,
  serviceExamples,
  businessMode,
}: { 
  formData: ServiceFormData;
  onChange: (field: keyof ServiceFormData, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew?: boolean;
  serviceExamples: ReturnType<typeof getServiceExamples>;
  businessMode: string;
}) {
  return (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs capitalize">{serviceExamples.serviceName} Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder={serviceExamples.serviceNamePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">How long does this take? (minutes)</Label>
          <Input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => onChange("duration_minutes", parseInt(e.target.value) || 60)}
            placeholder="60"
          />
          <p className="text-xs text-muted-foreground">{serviceExamples.durationHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder={serviceExamples.descriptionPlaceholder}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">How should AI quote this?</Label>
          <Select
            value={formData.price_type}
            onValueChange={(v) => onChange("price_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Quote exact price</SelectItem>
              <SelectItem value="starting_at">Quote "starting at" price</SelectItem>
              <SelectItem value="quote_only">Don't quote - offer callback</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.price_type === "fixed" && "AI says: \"That's $X\""}
            {formData.price_type === "starting_at" && "AI says: \"Starting at $X, depending on...\""}
            {formData.price_type === "quote_only" && "AI says: \"I'd need to have someone call you with a quote\""}
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

      {/* Price Factors — shown when price varies */}
      {(formData.price_type === "starting_at" || formData.price_type === "quote_only") && (
        <div className="space-y-2">
          <Label className="text-xs">What makes the price vary? <span className="text-muted-foreground">(AI will explain this to callers)</span></Label>
          <Textarea
            value={formData.price_factors}
            onChange={(e) => onChange("price_factors", e.target.value)}
            placeholder={PRICE_FACTOR_HINTS[businessMode] || PRICE_FACTOR_HINTS.general}
            rows={2}
          />
        </div>
      )}

      {/* Complexity Toggle — hidden for food mode */}
      {businessMode !== "food" && (
        <div className="space-y-2">
          <Label className="text-xs">How should the AI handle this?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.complexity === "simple" ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("complexity", "simple")}
              className="flex-1"
            >
              Quick confirmation
            </Button>
            <Button
              type="button"
              variant={formData.complexity === "complex" ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("complexity", "complex")}
              className="flex-1"
            >
              Ask detailed questions
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {formData.complexity === "simple"
              ? `Quick: ${(COMPLEXITY_HINTS[businessMode] || COMPLEXITY_HINTS.general).simple}`
              : `Detailed: ${(COMPLEXITY_HINTS[businessMode] || COMPLEXITY_HINTS.general).complex}`
            }
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.deposit_required}
            onCheckedChange={(checked) => onChange("deposit_required", checked)}
          />
          <Label className="text-sm">Collect deposit to confirm?</Label>
        </div>
        {formData.deposit_required && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Deposit ($):</Label>
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
}

export function ServiceCatalogEditor() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const { businessMode } = useTenantConfig();
  const { terms, config, slug } = useIndustryContext();
  const queryClient = useQueryClient();

  const serviceExamples = slug
    ? getSlugServiceExamples(businessMode, slug)
    : getServiceExamples(businessMode);

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [editingFormData, setEditingFormData] = useState<Record<string, ServiceFormData>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newServiceData, setNewServiceData] = useState<ServiceFormData>(defaultFormData);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

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
            complexity: service.complexity || "simple",
            price_factors: service.price_factors || "",
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
        complexity: formData.complexity,
        price_factors: formData.price_factors.trim() || undefined,
      });
      toast.success("Service updated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
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
        complexity: newServiceData.complexity,
        price_factors: newServiceData.price_factors.trim() || undefined,
      });
      toast.success("Service created");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
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
      invalidateBrainQueries(queryClient, tenant?.id);
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
      invalidateBrainQueries(queryClient, tenant?.id);
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

  // ServiceForm is now extracted as a top-level component above

  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Your {terms.services} are what your AI assistant uses to answer pricing questions and book {terms.bookings}. 
              Each {serviceExamples.serviceName} needs a <strong>name</strong>, <strong>duration</strong>, and <strong>price</strong>. 
              The AI will use this to help {terms.customers} understand what you offer.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> {serviceExamples.priceExamples}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Upload Banner - Always visible */}
      <InlineUploadButton
        contentType="services"
        variant="prominent"
        onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["services"] })}
      />

      {/* Quoting Behavior Guidance (non-dispatch modes) */}
      {config.pricing.showQuotingBehaviorGuidance && (
        <QuotingBehaviorGuidance pricingModel={config.pricing.pricingModel} />
      )}

      {/* AI Preview */}
      {services && services.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells {terms.customers}</p>
              <p className="text-sm italic">"{aiQuotePreview}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                The AI uses your {terms.services} catalog to provide accurate pricing and duration info
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold capitalize">{terms.services} Catalog</h3>
          <p className="text-sm text-muted-foreground">
            {services?.length 
              ? `${services.length} ${serviceExamples.serviceName}${services.length !== 1 ? 's' : ''} • Click to expand and edit`
              : `Add your ${terms.services} so the AI can quote prices and book ${terms.bookings}`
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPasteDialogOpen(true)}>
            <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
            Paste from POS
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            CSV Import
          </Button>
          <Button onClick={startCreatingNew} disabled={isCreatingNew}>
            <Plus className="h-4 w-4 mr-2" />
            {terms.addService}
          </Button>
        </div>
      </div>

      {/* New Service Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm capitalize">New {serviceExamples.serviceName}</span>
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
            serviceExamples={serviceExamples}
            businessMode={businessMode}
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
                        serviceExamples={serviceExamples}
                        businessMode={businessMode}
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
                <h3 className="font-semibold text-lg mb-1">No {terms.services} yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the upload button above to import your {terms.services} list, or add them manually.
                </p>
              </div>
              <Button onClick={startCreatingNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
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

      {/* POS Paste Dialog */}
      <PasteFromPOSDialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen} />

      {/* CSV Import Dialog */}
      <ServiceCSVImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />
    </div>
  );
}
