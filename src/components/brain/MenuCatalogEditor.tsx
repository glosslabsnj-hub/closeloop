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
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";

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
 * This component lives in Business Brain and is the ONLY place to edit menu items.
 * Follows the same pattern as ServiceCatalogEditor.
 */
export function MenuCatalogEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(defaultFormData);

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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group items by category
  const categories = [...new Set(menuItems?.map(item => item.category || "Uncategorized") || [])];

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

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      {menuItems && menuItems.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells guests</p>
              <p className="text-sm italic">"{aiPreview}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                The AI uses your menu to answer questions and take orders
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Menu Items</h3>
          <p className="text-sm text-muted-foreground">
            Add your menu items so the AI can answer questions and take orders
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Menu Items Grid by Category */}
      {menuItems && menuItems.length > 0 ? (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                {category}
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {menuItems
                  .filter(item => (item.category || "Uncategorized") === category)
                  .map((item) => (
                    <Card key={item.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1 line-clamp-2">
                                {item.description}
                              </CardDescription>
                            )}
                          </div>
                          {!item.is_available && (
                            <Badge variant="outline" className="ml-2">Unavailable</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                ${((item.price_cents || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                            {item.prep_time_minutes && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{item.prep_time_minutes} min</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAvailable(item)}
                            >
                              {item.is_available ? "Mark Unavailable" : "Mark Available"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingItem(item);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Utensils className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No menu items yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your menu items so the AI can answer pricing questions and take orders from customers.
              </p>
              <Button onClick={openCreateDialog} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
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
              <Label>Available</Label>
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
