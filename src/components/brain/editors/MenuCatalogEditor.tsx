import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Pencil, 
  Trash2, 
  Clock, 
  DollarSign, 
  Loader2, 
  Utensils, 
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { InlineUploadButton } from "../uploads/InlineUploadButton";

interface MenuItemFormData {
  name: string;
  description: string;
  category: string;
  price_cents: number;
  prep_time_minutes: number;
  is_available: boolean;
  dietary_tags: string[];
}

const defaultFormData: MenuItemFormData = {
  name: "",
  description: "",
  category: "",
  price_cents: 0,
  prep_time_minutes: 15,
  is_available: true,
  dietary_tags: [],
};

/**
 * MenuCatalogEditor - Inline menu management for food mode
 * 
 * Features:
 * - Collapsible category sections for large menus
 * - Inline upload button to quickly import menus
 * - Clear explanations of what each section does
 */
export function MenuCatalogEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(defaultFormData);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch menu items
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menu-items", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (item: MenuItemFormData) => {
      const { error } = await supabase
        .from("menu_items")
        .insert({
          tenant_id: tenant?.id,
          ...item,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("Menu item added");
      setDialogOpen(false);
      setFormData(defaultFormData);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add menu item");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MenuItemFormData> }) => {
      const { error } = await supabase
        .from("menu_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("Menu item updated");
      setDialogOpen(false);
      setEditingItem(null);
      setFormData(defaultFormData);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update menu item");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("Menu item deleted");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete menu item");
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      price_cents: item.price_cents || 0,
      prep_time_minutes: item.prep_time_minutes || 15,
      is_available: item.is_available ?? true,
      dietary_tags: item.dietary_tags || [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!tenant?.id || !formData.name.trim()) return;

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleAvailable = (item: any) => {
    updateMutation.mutate({
      id: item.id,
      updates: { is_available: !item.is_available },
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set(categories));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group items by category
  const categories = [...new Set(menuItems?.map(item => item.category || "Uncategorized") || [])];
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category] = menuItems?.filter(item => (item.category || "Uncategorized") === category) || [];
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading menu...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI preview for first item
  const firstItem = menuItems?.[0];
  const aiPreview = firstItem
    ? `Our ${firstItem.name} is $${((firstItem.price_cents || 0) / 100).toFixed(2)}${firstItem.prep_time_minutes ? ` and takes about ${firstItem.prep_time_minutes} minutes to prepare` : ""}.`
    : "I can tell you about our menu items and pricing.";

  const totalItems = menuItems?.length || 0;
  const availableItems = menuItems?.filter(i => i.is_available).length || 0;

  return (
    <div className="space-y-6">
      {/* Upload action */}
      <InlineUploadButton 
        contentType="menu" 
        variant="prominent"
        onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["menu-items"] })}
      />

      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Menu Items</h3>
          <p className="text-sm text-muted-foreground">
            {totalItems === 0 
              ? "Add your menu items so the AI can answer questions and take orders"
              : `${totalItems} items across ${categories.length} ${categories.length === 1 ? 'category' : 'categories'} • ${availableItems} available`
            }
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Menu Items by Category */}
      {menuItems && menuItems.length > 0 ? (
        <div className="space-y-2">
          {/* Expand/Collapse All */}
          {categories.length > 1 && (
            <div className="flex items-center justify-end gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={expandAllCategories}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAllCategories}>
                Collapse All
              </Button>
            </div>
          )}

          {categories.map((category) => {
            const items = itemsByCategory[category];
            const isExpanded = expandedCategories.has(category);
            const categoryAvailable = items.filter(i => i.is_available).length;

            return (
              <Collapsible 
                key={category} 
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h4 className="font-medium">{category}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </Badge>
                        {categoryAvailable < items.length && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {items.length - categoryAvailable} unavailable
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${((items.reduce((sum, i) => sum + (i.price_cents || 0), 0) / items.length / 100) || 0).toFixed(2)} avg
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t">
                      <div className="divide-y">
                        {items.map((item) => (
                          <div 
                            key={item.id} 
                            className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{item.name}</span>
                                {!item.is_available && (
                                  <Badge variant="outline" className="text-xs shrink-0">Unavailable</Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="flex items-center gap-3 text-sm">
                                <span className="font-medium">
                                  ${((item.price_cents || 0) / 100).toFixed(2)}
                                </span>
                                {item.prep_time_minutes && (
                                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                    <Clock className="h-3 w-3" />
                                    {item.prep_time_minutes}m
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingItem(item);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Utensils className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">No menu items yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the upload button above to import your menu, or add items manually.
                </p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>Configure your menu item details and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Classic Cheeseburger"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Burgers, Appetizers, Drinks..."
              />
              <p className="text-xs text-muted-foreground">
                Group similar items together (e.g., "Burgers", "Sides", "Drinks")
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description for customers"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(formData.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_cents: Math.round(parseFloat(e.target.value) * 100) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Prep Time (min)</Label>
                <Input
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      prep_time_minutes: parseInt(e.target.value) || 15,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Available</Label>
                <p className="text-xs text-muted-foreground">Turn off to hide from AI</p>
              </div>
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_available: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
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
