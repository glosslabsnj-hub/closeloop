/**
 * Service Packages Editor
 * 
 * Allows businesses to create:
 * - Bundles: Combine services for a discounted price
 * - Memberships: Recurring subscriptions with included services
 * - Treatment Series: Medical packages (e.g., 6-session laser treatment)
 * 
 * Industry-aware: Shows relevant package types based on business mode
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useServices } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Trash2,
  Loader2,
  Info,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Package,
  Star,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

type PackageType = "bundle" | "membership" | "treatment_series";
type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly";

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  package_type: PackageType;
  regular_price_cents: number | null;
  package_price_cents: number;
  billing_interval: BillingInterval | null;
  included_services_per_period: Record<string, number> | null;
  member_discount_percent: number;
  total_sessions: number | null;
  session_validity_days: number | null;
  included_items: Array<{ service_id: string; quantity: number }>;
  is_active: boolean;
  is_featured: boolean;
}

interface PackageFormData {
  name: string;
  description: string;
  package_type: PackageType;
  regular_price_cents: number;
  package_price_cents: number;
  billing_interval: BillingInterval;
  member_discount_percent: number;
  total_sessions: number;
  session_validity_days: number;
  included_items: Array<{ service_id: string; quantity: number }>;
  is_featured: boolean;
}

const defaultFormData: PackageFormData = {
  name: "",
  description: "",
  package_type: "bundle",
  regular_price_cents: 0,
  package_price_cents: 0,
  billing_interval: "monthly",
  member_discount_percent: 10,
  total_sessions: 6,
  session_validity_days: 180,
  included_items: [],
  is_featured: false,
};

const PACKAGE_TYPES = {
  bundle: {
    label: "Service Bundle",
    description: "Combine multiple services at a discounted price",
    icon: Package,
    modes: ["service", "dispatch", "medical", "general"],
    example: "Full Detail Package = Interior + Exterior + Ceramic Coating",
  },
  membership: {
    label: "Membership Plan",
    description: "Recurring subscription with included services each period",
    icon: CreditCard,
    modes: ["service", "medical"],
    example: "Gold Member = 2 washes/month + 10% off all services",
  },
  treatment_series: {
    label: "Treatment Series",
    description: "Package of treatments to be used over time",
    icon: Calendar,
    modes: ["medical", "service"],
    example: "6-Session Laser Package at 15% off",
  },
};

export function ServicePackagesEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { services } = useServices();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedType, setSelectedType] = useState<PackageType | null>(null);
  const [newFormData, setNewFormData] = useState<PackageFormData>(defaultFormData);
  const [editingFormData, setEditingFormData] = useState<Record<string, PackageFormData>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState<ServicePackage | null>(null);

  // Fetch packages
  const { data: packages, isLoading } = useQuery({
    queryKey: ["service-packages", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("service_packages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("display_order")
        .order("created_at");
      if (error) throw error;
      return (data || []) as unknown as ServicePackage[];
    },
    enabled: !!tenant?.id,
  });

  // Filter to primary services only
  const primaryServices = useMemo(() => {
    return services?.filter(s => s.service_type !== "secondary" && s.is_active) || [];
  }, [services]);

  // Filter relevant package types for this mode
  const relevantTypes = useMemo(() => {
    return Object.entries(PACKAGE_TYPES)
      .filter(([_, config]) => config.modes.includes(businessMode))
      .map(([key, config]) => ({ key: key as PackageType, ...config }));
  }, [businessMode]);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const calculateSavings = (regular: number, package_: number) => {
    if (!regular || regular <= package_) return null;
    const savings = regular - package_;
    const percent = Math.round((savings / regular) * 100);
    return { amount: savings, percent };
  };

  const _getServiceName = (serviceId: string) => {
    const service = primaryServices.find(s => s.id === serviceId);
    return service?.name || "Unknown Service";
  };

  const handleSave = async (packageId: string) => {
    if (!tenant?.id) return;
    const formData = editingFormData[packageId];
    if (!formData?.name.trim()) return;

    setSavingId(packageId);
    try {
      const { error } = await supabase
        .from("service_packages")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          package_type: formData.package_type,
          regular_price_cents: formData.regular_price_cents || null,
          package_price_cents: formData.package_price_cents,
          billing_interval: formData.package_type === "membership" ? formData.billing_interval : null,
          member_discount_percent: formData.member_discount_percent,
          total_sessions: formData.package_type === "treatment_series" ? formData.total_sessions : null,
          session_validity_days: formData.package_type === "treatment_series" ? formData.session_validity_days : null,
          included_items: formData.included_items,
          is_featured: formData.is_featured,
        })
        .eq("id", packageId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success("Package updated");
      queryClient.invalidateQueries({ queryKey: ["service-packages"] });
      setExpandedId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!tenant?.id || !newFormData.name.trim()) return;

    setSavingId("new");
    try {
      const { error } = await supabase
        .from("service_packages")
        .insert({
          tenant_id: tenant.id,
          name: newFormData.name.trim(),
          description: newFormData.description.trim() || null,
          package_type: newFormData.package_type,
          regular_price_cents: newFormData.regular_price_cents || null,
          package_price_cents: newFormData.package_price_cents,
          billing_interval: newFormData.package_type === "membership" ? newFormData.billing_interval : null,
          member_discount_percent: newFormData.member_discount_percent,
          total_sessions: newFormData.package_type === "treatment_series" ? newFormData.total_sessions : null,
          session_validity_days: newFormData.package_type === "treatment_series" ? newFormData.session_validity_days : null,
          included_items: newFormData.included_items,
          is_featured: newFormData.is_featured,
        });

      if (error) throw error;
      toast.success("Package created");
      queryClient.invalidateQueries({ queryKey: ["service-packages"] });
      setIsCreatingNew(false);
      setSelectedType(null);
      setNewFormData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to create");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingPackage) return;

    try {
      const { error } = await supabase
        .from("service_packages")
        .delete()
        .eq("id", deletingPackage.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success("Package removed");
      queryClient.invalidateQueries({ queryKey: ["service-packages"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPackage(null);
    }
  };

  const handleToggleActive = async (pkg: ServicePackage) => {
    if (!tenant?.id) return;

    try {
      const { error } = await supabase
        .from("service_packages")
        .update({ is_active: !pkg.is_active })
        .eq("id", pkg.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success(pkg.is_active ? "Package hidden" : "Package visible");
      queryClient.invalidateQueries({ queryKey: ["service-packages"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const addServiceToForm = (formData: PackageFormData, setFormData: (data: PackageFormData) => void) => {
    if (primaryServices.length === 0) return;
    const existingIds = formData.included_items.map(i => i.service_id);
    const availableService = primaryServices.find(s => !existingIds.includes(s.id));
    if (availableService) {
      setFormData({
        ...formData,
        included_items: [...formData.included_items, { service_id: availableService.id, quantity: 1 }],
      });
    }
  };

  const removeServiceFromForm = (
    formData: PackageFormData,
    setFormData: (data: PackageFormData) => void,
    index: number
  ) => {
    setFormData({
      ...formData,
      included_items: formData.included_items.filter((_, i) => i !== index),
    });
  };

  const toggleExpanded = (id: string, pkg: ServicePackage) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!editingFormData[id]) {
        setEditingFormData(prev => ({
          ...prev,
          [id]: {
            name: pkg.name,
            description: pkg.description || "",
            package_type: pkg.package_type,
            regular_price_cents: pkg.regular_price_cents || 0,
            package_price_cents: pkg.package_price_cents,
            billing_interval: pkg.billing_interval || "monthly",
            member_discount_percent: pkg.member_discount_percent,
            total_sessions: pkg.total_sessions || 6,
            session_validity_days: pkg.session_validity_days || 180,
            included_items: pkg.included_items || [],
            is_featured: pkg.is_featured,
          },
        }));
      }
    }
    setIsCreatingNew(false);
  };

  // AI Preview
  const aiPreview = useMemo(() => {
    const activePackages = packages?.filter(p => p.is_active) || [];
    if (activePackages.length === 0) return null;
    
    const featured = activePackages.find(p => p.is_featured) || activePackages[0];
    const savings = calculateSavings(featured.regular_price_cents || 0, featured.package_price_cents);
    
    if (savings) {
      return `Our ${featured.name} is ${formatPrice(featured.package_price_cents)} — that's ${savings.percent}% off if you purchased separately!`;
    }
    return `We have a ${featured.name} available for ${formatPrice(featured.package_price_cents)}.`;
  }, [packages]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading packages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form Component
  const PackageForm = ({
    formData,
    onChange,
    onSave,
    onCancel,
    isSaving,
    isNew = false,
  }: {
    formData: PackageFormData;
    onChange: (data: PackageFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    isNew?: boolean;
  }) => {
    const _typeConfig = PACKAGE_TYPES[formData.package_type];
    const savings = calculateSavings(formData.regular_price_cents, formData.package_price_cents);

    return (
      <div className="p-4 space-y-4 border-t bg-muted/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Package Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              placeholder="e.g., Full Detail Package, Gold Membership"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Package Type</Label>
            <Select
              value={formData.package_type}
              onValueChange={(v) => onChange({ ...formData, package_type: v as PackageType })}
              disabled={!isNew}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relevantTypes.map(type => (
                  <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Description (optional)</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            placeholder="What's included and why it's a great value..."
            rows={2}
          />
        </div>

        {/* Included Services */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Included Services</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addServiceToForm(formData, onChange)}
              disabled={primaryServices.length === 0}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Service
            </Button>
          </div>
          {formData.included_items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No services added yet. Add services to include in this package.
            </p>
          ) : (
            <div className="space-y-2">
              {formData.included_items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={item.service_id}
                    onValueChange={(v) => {
                      const newItems = [...formData.included_items];
                      newItems[index] = { ...item, service_id: v };
                      onChange({ ...formData, included_items: newItems });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {primaryServices.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...formData.included_items];
                      newItems[index] = { ...item, quantity: parseInt(e.target.value) || 1 };
                      onChange({ ...formData, included_items: newItems });
                    }}
                    className="w-16"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeServiceFromForm(formData, onChange, index)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Regular Price (if purchased separately)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={(formData.regular_price_cents / 100).toFixed(2)}
                onChange={(e) => onChange({ ...formData, regular_price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className="pl-8"
                placeholder="250.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Package Price *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={(formData.package_price_cents / 100).toFixed(2)}
                onChange={(e) => onChange({ ...formData, package_price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className="pl-8"
                placeholder="199.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Savings</Label>
            <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50">
              {savings ? (
                <span className="text-sm font-medium text-primary">
                  Save {savings.percent}% ({formatPrice(savings.amount)})
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Set both prices</span>
              )}
            </div>
          </div>
        </div>

        {/* Membership-specific fields */}
        {formData.package_type === "membership" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs">Billing Interval</Label>
              <Select
                value={formData.billing_interval}
                onValueChange={(v) => onChange({ ...formData, billing_interval: v as BillingInterval })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Member Discount on Other Services (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.member_discount_percent}
                onChange={(e) => onChange({ ...formData, member_discount_percent: parseInt(e.target.value) || 0 })}
                placeholder="10"
              />
            </div>
          </div>
        )}

        {/* Treatment Series-specific fields */}
        {formData.package_type === "treatment_series" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs">Total Sessions</Label>
              <Input
                type="number"
                min={1}
                value={formData.total_sessions}
                onChange={(e) => onChange({ ...formData, total_sessions: parseInt(e.target.value) || 1 })}
                placeholder="6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Days to Use All Sessions</Label>
              <Input
                type="number"
                min={1}
                value={formData.session_validity_days}
                onChange={(e) => onChange({ ...formData, session_validity_days: parseInt(e.target.value) || 180 })}
                placeholder="180"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.is_featured}
              onChange={(e) => onChange({ ...formData, is_featured: e.target.checked })}
              className="rounded border-input"
            />
            <Label htmlFor="featured" className="text-xs text-muted-foreground cursor-pointer">
              Feature this package (AI mentions it first)
            </Label>
          </div>
          <div className="flex items-center gap-2">
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
              {isNew ? "Create Package" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What are Service Packages?</p>
            <p className="text-sm text-muted-foreground">
              Packages let you bundle services together at a discounted price. 
              When customers ask about deals or packages, the AI can offer these options and explain the savings.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Mark one package as "featured" so the AI suggests it first!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {aiPreview && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">How the AI promotes packages</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Create New Section */}
      {!isCreatingNew && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Create a Package</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {relevantTypes.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.key}
                  onClick={() => {
                    setNewFormData({ ...defaultFormData, package_type: type.key });
                    setSelectedType(type.key);
                    setIsCreatingNew(true);
                  }}
                  className="flex flex-col items-start gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{type.label}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* New Package Form */}
      {isCreatingNew && selectedType && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              New {PACKAGE_TYPES[selectedType].label}
            </span>
          </div>
          <PackageForm
            formData={newFormData}
            onChange={setNewFormData}
            onSave={handleCreate}
            onCancel={() => {
              setIsCreatingNew(false);
              setSelectedType(null);
              setNewFormData(defaultFormData);
            }}
            isSaving={savingId === "new"}
            isNew
          />
        </Card>
      )}

      {/* Existing Packages */}
      {packages && packages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Your Packages</h3>
          <div className="space-y-2">
            {packages.map(pkg => {
              const typeConfig = PACKAGE_TYPES[pkg.package_type];
              const Icon = typeConfig.icon;
              const isExpanded = expandedId === pkg.id;
              const savings = calculateSavings(pkg.regular_price_cents || 0, pkg.package_price_cents);

              return (
                <Collapsible
                  key={pkg.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(pkg.id, pkg)}
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
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{pkg.name}</span>
                              {pkg.is_featured && (
                                <Star className="h-3 w-3 text-warning fill-warning" />
                              )}
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {typeConfig.label}
                              </Badge>
                              {!pkg.is_active && (
                                <Badge variant="outline" className="text-xs shrink-0">Hidden</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatPrice(pkg.package_price_cents)}</p>
                            {savings && (
                              <p className="text-xs text-primary">Save {savings.percent}%</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {editingFormData[pkg.id] && (
                        <PackageForm
                          formData={editingFormData[pkg.id]}
                          onChange={(data) => setEditingFormData(prev => ({ ...prev, [pkg.id]: data }))}
                          onSave={() => handleSave(pkg.id)}
                          onCancel={() => setExpandedId(null)}
                          isSaving={savingId === pkg.id}
                        />
                      )}
                      <div className="px-4 pb-3 flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(pkg)}
                        >
                          {pkg.is_active ? "Hide from AI" : "Show to AI"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingPackage(pkg);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!packages || packages.length === 0) && !isCreatingNew && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No packages created yet</p>
          <p className="text-xs mt-1">Create a package to offer bundled discounts</p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deletingPackage?.name}" from your offerings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
