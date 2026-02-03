import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  DollarSign,
  Clock,
  Loader2,
  Sparkles,
  Truck,
} from "lucide-react";
import { updateService, deleteService, createService } from "@/lib/brain/writeBrainFact";
import { DispatchServiceEditor } from "./DispatchServiceEditor";
import {
  DISPATCH_CATEGORIES,
  type DispatchServiceCategory,
  type DispatchPricingConfig,
  generatePricingSummary,
} from "@/types/dispatchPricing";

interface GroupedServices {
  category: DispatchServiceCategory;
  label: string;
  services: any[];
  order: number;
}

export function DispatchServiceCatalog() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["towing", "roadside"]));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<any | null>(null);

  // Group services by category
  const groupedServices = useMemo(() => {
    if (!services) return [];

    const filtered = searchQuery
      ? services.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : services;

    const groups: Record<string, GroupedServices> = {};

    for (const service of filtered) {
      const category = (service.service_category as DispatchServiceCategory) || "uncategorized";
      const categoryInfo = DISPATCH_CATEGORIES[category] || DISPATCH_CATEGORIES.uncategorized;

      if (!groups[category]) {
        groups[category] = {
          category,
          label: categoryInfo.label,
          services: [],
          order: categoryInfo.order,
        };
      }
      groups[category].services.push(service);
    }

    return Object.values(groups).sort((a, b) => a.order - b.order);
  }, [services, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleToggleActive = async (service: any) => {
    if (!tenant?.id) return;
    try {
      await updateService(service.id, tenant.id, { is_active: !service.is_active });
      toast.success(service.is_active ? "Service deactivated" : "Service activated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    }
  };

  const handleDuplicate = async (service: any) => {
    if (!tenant?.id) return;
    try {
      const pricingConfig = service.pricing_config_json as Record<string, unknown> | null;
      await createService(tenant.id, {
        name: `${service.name} (Copy)`,
        description: service.description,
        duration_minutes: service.duration_minutes,
        price_type: service.price_type,
        price_amount: service.price_amount,
        service_category: service.service_category,
        service_type: service.service_type,
        pricing_config_json: pricingConfig || undefined,
      });
      toast.success("Service duplicated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate service");
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingService) return;
    try {
      await deleteService(deletingService.id, tenant.id);
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeleteDialogOpen(false);
      setDeletingService(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  const formatPrice = (service: any) => {
    // Safely cast the JSONB to our config type
    const rawConfig = service.pricing_config_json;
    const config: DispatchPricingConfig | null = 
      rawConfig && typeof rawConfig === "object" && "pricing_model" in rawConfig
        ? (rawConfig as unknown as DispatchPricingConfig)
        : null;
    
    if (config?.pricing_model === "distance_tiered" && config.distance_tiers?.length) {
      const first = config.distance_tiers[0];
      const hasPerMile = config.distance_tiers.some(t => t.per_mile_price && t.per_mile_price > 0);
      return `$${first.base_price}${hasPerMile ? " + mi" : ""}`;
    }
    
    if (service.price_type === "quote_only") return "Quote";
    if (!service.price_amount && !config?.min_price) return "Quote";
    
    const price = service.price_amount || config?.min_price || 0;
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${price}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
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

  // Build AI quote preview
  const activeServices = services?.filter(s => s.is_active) || [];
  const firstService = activeServices[0];
  const firstPricingConfig = firstService?.pricing_config_json as unknown as DispatchPricingConfig | null;
  const aiQuotePreview = firstService
    ? generatePricingSummary(firstPricingConfig, firstService.name)
    : "I can help you with our range of services. What do you need assistance with?";

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      {activeServices.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
              <p className="text-sm italic">"{aiQuotePreview}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                {activeServices.length} active service{activeServices.length !== 1 ? "s" : ""} across {groupedServices.length} categor{groupedServices.length !== 1 ? "ies" : "y"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Service Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Configure your dispatch services with distance-based pricing
          </p>
        </div>
        <Button onClick={() => { setEditingService(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      {services && services.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Category Groups */}
      {groupedServices.length > 0 ? (
        <div className="space-y-3">
          {groupedServices.map((group) => (
            <Collapsible
              key={group.category}
              open={expandedCategories.has(group.category)}
              onOpenChange={() => toggleCategory(group.category)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(group.category) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-base">{group.label}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {group.services.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingService(null);
                          setEditorOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3">
                    <div className="divide-y">
                      {group.services.map((service) => (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between py-3 gap-4 ${
                            !service.is_active ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{service.name}</span>
                              {!service.is_active && (
                                <Badge variant="outline" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {service.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{formatPrice(service)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatDuration(service.duration_minutes)}</span>
                            </div>

                            <Switch
                              checked={service.is_active}
                              onCheckedChange={() => handleToggleActive(service)}
                            />

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingService(service);
                                    setEditorOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(service)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setDeletingService(service);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : services && services.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No services yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Start by adding your dispatch services. Choose from presets like Local Tow, Jump Start, or Lockout,
                or create custom services with distance-based pricing.
              </p>
              <Button onClick={() => setEditorOpen(true)} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : searchQuery ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No services match "{searchQuery}"</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Service Editor Dialog */}
      <DispatchServiceEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingService={editingService}
        onSuccess={() => setEditingService(null)}
      />

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
