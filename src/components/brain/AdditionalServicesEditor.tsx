/**
 * Additional Services Editor
 * 
 * Allows businesses to configure secondary/additional services they offer
 * beyond their core business (e.g., body work for a tow company).
 * 
 * The AI adapts its behavior based on the detail level configured:
 * - Full pricing: AI can quote prices directly
 * - Basic info only: AI mentions service and offers callback
 */

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
import { Plus, Trash2, Loader2, Info, Lightbulb, ChevronDown, ChevronRight, Check, X, Wrench, PhoneCall, DollarSign } from "lucide-react";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  service_category: string;
  price_type: PriceType;
  price_amount: number | null;
  duration_minutes: number;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  service_category: "",
  price_type: "quote_only",
  price_amount: null,
  duration_minutes: 60,
};

// Common additional service categories by business type
const CATEGORY_SUGGESTIONS = [
  "Auto Repair",
  "Body Work",
  "Detailing",
  "Maintenance",
  "Specialty Services",
  "Consulting",
  "Add-on Services",
  "Other",
];

export function AdditionalServicesEditor() {
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

  // Filter to only secondary services
  const secondaryServices = services?.filter(s => s.service_type === "secondary") || [];

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote/Callback";
    if (!service.price_amount) return "Not Set";
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${service.price_amount}`;
  };

  const toggleService = (serviceId: string, service: any) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
    } else {
      setExpandedServiceId(serviceId);
      if (!editingFormData[serviceId]) {
        setEditingFormData(prev => ({
          ...prev,
          [serviceId]: {
            name: service.name,
            description: service.description || "",
            service_category: service.service_category || "",
            price_type: service.price_type,
            price_amount: service.price_amount ? Number(service.price_amount) : null,
            duration_minutes: service.duration_minutes || 60,
          }
        }));
      }
    }
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
        service_category: formData.service_category.trim() || undefined,
        price_type: formData.price_type,
        price_amount: formData.price_amount,
        duration_minutes: formData.duration_minutes,
        service_type: "secondary",
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
        service_category: newServiceData.service_category.trim() || undefined,
        price_type: newServiceData.price_type,
        price_amount: newServiceData.price_amount,
        duration_minutes: newServiceData.duration_minutes,
        service_type: "secondary",
        is_active: true,
      });
      toast.success("Additional service added");
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
      toast.success("Service removed");
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
      toast.success(service.is_active ? "Service hidden from AI" : "Service visible to AI");
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

  // Build AI preview based on configured services
  const aiPreview = secondaryServices.length > 0
    ? secondaryServices.some(s => s.price_amount)
      ? `We also offer ${secondaryServices.map(s => s.name.toLowerCase()).join(", ")}. Would you like pricing information?`
      : `We also offer ${secondaryServices.map(s => s.name.toLowerCase()).join(", ")}. Would you like me to have someone call you with details?`
    : null;

  // Inline form component
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
            placeholder="Body Work, Auto Repair, etc."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Category</Label>
          <Select
            value={formData.service_category || ""}
            onValueChange={(v) => onChange("service_category", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_SUGGESTIONS.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Groups related services together</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="What's included, who it's for, any details the AI should know..."
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          The more detail you add, the better the AI can explain this service
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">How should AI handle pricing?</Label>
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
              <SelectItem value="quote_only">Offer callback for quote</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
            {formData.price_type === "fixed" && (
              <><DollarSign className="h-3 w-3 mt-0.5 text-primary" /><span>AI says: "That's $X"</span></>
            )}
            {formData.price_type === "starting_at" && (
              <><DollarSign className="h-3 w-3 mt-0.5 text-primary/70" /><span>AI says: "Starting at $X"</span></>
            )}
            {formData.price_type === "quote_only" && (
              <><PhoneCall className="h-3 w-3 mt-0.5 text-muted-foreground" /><span>AI says: "I'll have someone call you"</span></>
            )}
          </div>
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
            <p className="text-sm font-medium">What are Additional Services?</p>
            <p className="text-sm text-muted-foreground">
              These are services your business offers <strong>in addition</strong> to your core business. 
              For example, a tow company might also offer body work or auto repair. 
              The AI will mention these when relevant and either quote prices or offer callbacks based on your configuration.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Add as much or as little detail as you want — the AI adapts!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {aiPreview && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Wrench className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Additional Services</h3>
          <p className="text-sm text-muted-foreground">
            {secondaryServices.length 
              ? `${secondaryServices.length} additional service${secondaryServices.length !== 1 ? 's' : ''} configured`
              : "Add services beyond your core business"
            }
          </p>
        </div>
        <Button onClick={startCreatingNew} disabled={isCreatingNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* New Service Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">New Additional Service</span>
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
      {secondaryServices.length > 0 ? (
        <div className="space-y-2">
          {secondaryServices.map((service) => {
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
                            {service.service_category && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {service.service_category}
                              </Badge>
                            )}
                            {!service.is_active && (
                              <Badge variant="outline" className="text-xs shrink-0">Hidden</Badge>
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
                        <span className="text-sm font-medium">{formatPrice(service)}</span>
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
                          {service.is_active ? "Visible to AI" : "Hidden from AI"}
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
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">No additional services yet</h3>
                <p className="text-sm text-muted-foreground">
                  If your business offers services beyond your core focus (like body work for a tow company), 
                  add them here so the AI can inform customers.
                </p>
              </div>
              <Button onClick={startCreatingNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
