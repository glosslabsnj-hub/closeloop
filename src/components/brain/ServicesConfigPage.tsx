import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { usePricingRules, type PricingRule } from "@/hooks/usePricingRules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus, Search, Clock, DollarSign, Loader2, ChevronDown, ChevronRight,
  MoreHorizontal, Pencil, Trash2, Copy, BarChart2, Tag, X, Filter, Info, Layers
} from "lucide-react";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PricingRulesEditor } from "@/components/knowledge/PricingRulesEditor";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  price_max: number | null;
  deposit_required: boolean;
  deposit_amount: number | null;
  upsell_suggestions: string[];
  prep_instructions: string;
  is_active: boolean;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  category: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  price_max: null,
  deposit_required: false,
  deposit_amount: null,
  upsell_suggestions: [],
  prep_instructions: "",
  is_active: true,
};

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

export function ServicesConfigPage() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["default"]));
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newUpsell, setNewUpsell] = useState("");

  // Extract unique categories from services
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services?.forEach((s) => {
      const category = (s as any).category || "Uncategorized";
      cats.add(category);
    });
    return Array.from(cats).sort();
  }, [services]);

  // Group services by category
  const groupedServices = useMemo(() => {
    const filtered = services?.filter((service) => {
      const matchesSearch = !searchQuery || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const serviceCategory = (service as any).category || "Uncategorized";
      const matchesCategory = !categoryFilter || serviceCategory === categoryFilter;
      
      const matchesPrice = !priceFilter || (() => {
        const price = service.price_amount || 0;
        switch (priceFilter) {
          case "under25": return price < 25;
          case "25to50": return price >= 25 && price < 50;
          case "50to100": return price >= 50 && price < 100;
          case "over100": return price >= 100;
          default: return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesPrice;
    }) || [];

    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((service) => {
      const category = (service as any).category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(service);
    });

    return groups;
  }, [services, searchQuery, categoryFilter, priceFilter]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote";
    if (!service.price_amount) return "—";
    const amount = `$${service.price_amount}`;
    if (service.price_type === "starting_at") return `${amount}+`;
    if (service.price_max) return `$${service.price_amount}-${service.price_max}`;
    return amount;
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const openEditDialog = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: (service as any).category || "",
      duration_minutes: service.duration_minutes,
      price_type: service.price_type,
      price_amount: service.price_amount ? Number(service.price_amount) : null,
      price_max: (service as any).price_max ? Number((service as any).price_max) : null,
      deposit_required: service.deposit_required || false,
      deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
      upsell_suggestions: (service as any).upsell_suggestions || [],
      prep_instructions: (service as any).prep_instructions || "",
      is_active: service.is_active ?? true,
    });
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleDuplicate = (service: any) => {
    setEditingService(null);
    setFormData({
      name: `${service.name} (Copy)`,
      description: service.description || "",
      category: (service as any).category || "",
      duration_minutes: service.duration_minutes,
      price_type: service.price_type,
      price_amount: service.price_amount ? Number(service.price_amount) : null,
      price_max: (service as any).price_max ? Number((service as any).price_max) : null,
      deposit_required: service.deposit_required || false,
      deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
      upsell_suggestions: (service as any).upsell_suggestions || [],
      prep_instructions: (service as any).prep_instructions || "",
      is_active: true,
    });
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData.name.trim()) return;
    
    setIsSaving(true);
    try {
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        duration_minutes: formData.duration_minutes,
        price_type: formData.price_type,
        price_amount: formData.price_type === "quote_only" ? null : formData.price_amount,
        price_max: formData.price_max,
        deposit_required: formData.deposit_required,
        deposit_amount: formData.deposit_required ? formData.deposit_amount : null,
        upsell_suggestions: formData.upsell_suggestions,
        prep_instructions: formData.prep_instructions.trim() || undefined,
        is_active: formData.is_active,
      };

      if (editingService) {
        await updateService(editingService.id, tenant.id, serviceData);
        toast.success("Service updated");
      } else {
        await createService(tenant.id, serviceData);
        toast.success("Service created");
      }
      
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setIsSaving(false);
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

  const addUpsell = () => {
    if (!newUpsell.trim()) return;
    setFormData({
      ...formData,
      upsell_suggestions: [...formData.upsell_suggestions, newUpsell.trim()],
    });
    setNewUpsell("");
  };

  const removeUpsell = (index: number) => {
    setFormData({
      ...formData,
      upsell_suggestions: formData.upsell_suggestions.filter((_, i) => i !== index),
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter(null);
    setPriceFilter(null);
  };

  const hasActiveFilters = searchQuery || categoryFilter || priceFilter;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Services & Pricing</h2>
          <p className="text-sm text-muted-foreground">
            {services?.length || 0} services configured
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Layers className="h-4 w-4" />
            All Services
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="pricing-rules" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing Rules
          </TabsTrigger>
        </TabsList>

        {/* ALL SERVICES TAB */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priceFilter || "all"} onValueChange={(v) => setPriceFilter(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under25">Under $25</SelectItem>
                    <SelectItem value="25to50">$25 - $50</SelectItem>
                    <SelectItem value="50to100">$50 - $100</SelectItem>
                    <SelectItem value="over100">$100+</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Services List Grouped by Category */}
          {Object.keys(groupedServices).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedServices).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryServices]) => (
                <Card key={category} className="overflow-hidden">
                  <Collapsible
                    open={expandedCategories.has(category) || expandedCategories.has("default")}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-semibold text-sm">{category.toUpperCase()}</span>
                          <Badge variant="secondary">{categoryServices.length}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit category could be implemented here
                          }}
                        >
                          Edit Group
                        </Button>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y">
                        {categoryServices.map((service) => (
                          <div
                            key={service.id}
                            className="px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{service.name}</span>
                                  {!service.is_active && (
                                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                    {service.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDuration(service.duration_minutes)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {formatPrice(service)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    {/* Mock booking stats */}
                                    {Math.floor(Math.random() * 50 + 10)} bookings/month
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(service)}
                                >
                                  Edit
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDuplicate(service)}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setDeletingService(service);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No services found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "Add your first service to get started"}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Category */}
          {Object.keys(groupedServices).length > 0 && (
            <Button variant="outline" className="w-full" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Manage Categories</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Categories are automatically created from your services. 
                  Assign a category when creating or editing a service.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-sm px-3 py-1">
                      {cat} ({groupedServices[cat]?.length || 0})
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRICING RULES TAB */}
        <TabsContent value="pricing-rules" className="mt-4">
          <PricingRulesEditor />
        </TabsContent>
      </Tabs>

      {/* Service Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              Configure the service details that your AI will use when talking to customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Service Name */}
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Women's Haircut"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Professional cut and style for any hair length. Includes consultation, shampoo, and blowdry."
                rows={3}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                This is what AI tells customers when they ask about it
              </p>
            </div>

            {/* Category and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Haircuts"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pricing</Label>
              <RadioGroup
                value={formData.price_type}
                onValueChange={(v) => setFormData({ ...formData, price_type: v as PriceType })}
                className="space-y-3"
              >
                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="fixed" id="price-fixed" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="price-fixed" className="cursor-pointer">Fixed Price</Label>
                    {formData.price_type === "fixed" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.price_amount ?? ""}
                          onChange={(e) => setFormData({ ...formData, price_amount: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="45.00"
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="starting_at" id="price-range" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="price-range" className="cursor-pointer">Price Range</Label>
                    {formData.price_type === "starting_at" && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.price_amount ?? ""}
                            onChange={(e) => setFormData({ ...formData, price_amount: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="45.00"
                            className="w-24"
                          />
                          <span className="text-muted-foreground">to</span>
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.price_max ?? ""}
                            onChange={(e) => setFormData({ ...formData, price_max: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="65.00"
                            className="w-24"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          AI will say "starting at $45, up to $65 depending on..."
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="quote_only" id="price-quote" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="price-quote" className="cursor-pointer">Quote Only</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI will not quote a price, will take contact info instead
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Upsell Suggestions */}
            <div className="space-y-2">
              <Label>Upsell Suggestions (AI will suggest these)</Label>
              <div className="flex flex-wrap gap-2">
                {formData.upsell_suggestions.map((upsell, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {upsell}
                    <button
                      onClick={() => removeUpsell(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    value={newUpsell}
                    onChange={(e) => setNewUpsell(e.target.value)}
                    placeholder="Deep Conditioning +$15"
                    className="h-7 w-48 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUpsell())}
                  />
                  <Button variant="ghost" size="sm" onClick={addUpsell} className="h-7 px-2">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  Advanced Options
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Requires Deposit</Label>
                    <p className="text-xs text-muted-foreground">Collect payment before confirming</p>
                  </div>
                  <Switch
                    checked={formData.deposit_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, deposit_required: checked })}
                  />
                </div>
                
                {formData.deposit_required && (
                  <div className="space-y-2">
                    <Label>Deposit Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.deposit_amount ?? ""}
                        onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="25.00"
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Preparation Instructions</Label>
                  <Textarea
                    value={formData.prep_instructions}
                    onChange={(e) => setFormData({ ...formData, prep_instructions: e.target.value })}
                    placeholder="What should the customer do before the appointment?"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Visible to customers</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingService && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDialogOpen(false);
                  setDeletingService(editingService);
                  setDeleteDialogOpen(true);
                }}
                className="sm:mr-auto"
              >
                Delete Service
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingService ? "Save Service" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
