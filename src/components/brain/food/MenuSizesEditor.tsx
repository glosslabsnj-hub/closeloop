/**
 * Menu Sizes Editor
 * 
 * Manage size variants for menu items:
 * - Small, Medium, Large
 * - Personal, Family, Party size
 * - Custom sizes per item
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Scale,
} from "lucide-react";
import { toast } from "sonner";

interface MenuItemSize {
  id: string;
  menu_item_id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  price_cents: number | null;
}

const COMMON_SIZE_TEMPLATES = [
  { name: "Small", priceMultiplier: 0.8 },
  { name: "Medium", priceMultiplier: 1.0 },
  { name: "Large", priceMultiplier: 1.3 },
];

const ALT_SIZE_TEMPLATES = [
  { name: "Personal", priceMultiplier: 1.0 },
  { name: "Sharing", priceMultiplier: 1.8 },
  { name: "Family", priceMultiplier: 2.5 },
];

export function MenuSizesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSize, setDeletingSize] = useState<MenuItemSize | null>(null);

  // Fetch menu items
  const { data: menuItems, isLoading: loadingItems } = useQuery({
    queryKey: ["menu-items", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, category, price_cents")
        .eq("tenant_id", tenant.id)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch sizes
  const { data: allSizes, isLoading: loadingSizes } = useQuery({
    queryKey: ["menu-item-sizes", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("menu_item_sizes")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("display_order");
      if (error) throw error;
      return data as MenuItemSize[];
    },
    enabled: !!tenant?.id,
  });

  // Group sizes by menu item
  const sizesByItem = useMemo(() => {
    const grouped: Record<string, MenuItemSize[]> = {};
    allSizes?.forEach(size => {
      if (!grouped[size.menu_item_id]) grouped[size.menu_item_id] = [];
      grouped[size.menu_item_id].push(size);
    });
    return grouped;
  }, [allSizes]);

  // Items with sizes
  const itemsWithSizes = useMemo(() => {
    return menuItems?.filter(item => sizesByItem[item.id]?.length > 0) || [];
  }, [menuItems, sizesByItem]);

  // Items without sizes
  const itemsWithoutSizes = useMemo(() => {
    return menuItems?.filter(item => !sizesByItem[item.id]?.length) || [];
  }, [menuItems, sizesByItem]);

  const handleAddSizes = async (itemId: string, template: typeof COMMON_SIZE_TEMPLATES) => {
    if (!tenant?.id) return;
    
    const item = menuItems?.find(i => i.id === itemId);
    if (!item) return;
    
    const basePrice = item.price_cents || 1000;
    
    setSavingId(itemId);
    try {
      const sizes = template.map((t, i) => ({
        tenant_id: tenant.id,
        menu_item_id: itemId,
        name: t.name,
        price_cents: Math.round(basePrice * t.priceMultiplier),
        is_default: t.priceMultiplier === 1.0,
        display_order: i,
        is_active: true,
      }));

      const { error } = await supabase
        .from("menu_item_sizes")
        .insert(sizes);

      if (error) throw error;
      
      toast.success("Sizes added");
      queryClient.invalidateQueries({ queryKey: ["menu-item-sizes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add sizes");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateSize = async (sizeId: string, updates: Partial<MenuItemSize>) => {
    if (!tenant?.id) return;
    
    setSavingId(sizeId);
    try {
      const { error } = await supabase
        .from("menu_item_sizes")
        .update(updates)
        .eq("id", sizeId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success("Size updated");
      queryClient.invalidateQueries({ queryKey: ["menu-item-sizes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteSize = async () => {
    if (!tenant?.id || !deletingSize) return;
    
    try {
      const { error } = await supabase
        .from("menu_item_sizes")
        .delete()
        .eq("id", deletingSize.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success("Size removed");
      queryClient.invalidateQueries({ queryKey: ["menu-item-sizes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingSize(null);
    }
  };

  const handleRemoveAllSizes = async (itemId: string) => {
    if (!tenant?.id) return;
    
    setSavingId(itemId);
    try {
      const { error } = await supabase
        .from("menu_item_sizes")
        .delete()
        .eq("menu_item_id", itemId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success("Sizes removed");
      queryClient.invalidateQueries({ queryKey: ["menu-item-sizes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to remove sizes");
    } finally {
      setSavingId(null);
    }
  };

  const isLoading = loadingItems || loadingSizes;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading sizes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI Preview
  const aiPreview = itemsWithSizes.length > 0
    ? `We have ${itemsWithSizes[0].name} in ${sizesByItem[itemsWithSizes[0].id]?.map(s => s.name).join(", ")}. Which size would you like?`
    : "I can tell you about our menu items and sizes.";

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Add size options to menu items. When a customer orders, 
              the AI will ask which size they want and quote the correct price.
            </p>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {itemsWithSizes.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Scale className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI asks</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Items with sizes */}
      {itemsWithSizes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Items with Sizes ({itemsWithSizes.length})</h4>
          
          {itemsWithSizes.map(item => {
            const sizes = sizesByItem[item.id] || [];
            const isExpanded = expandedItemId === item.id;

            return (
              <Collapsible
                key={item.id}
                open={isExpanded}
                onOpenChange={() => setExpandedItemId(isExpanded ? null : item.id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">{item.name}</span>
                        <div className="flex gap-1">
                          {sizes.map(s => (
                            <Badge key={s.id} variant="secondary" className="text-xs">
                              {s.name}: ${(s.price_cents / 100).toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      {sizes.map(size => (
                        <div key={size.id} className="flex items-center gap-3">
                          <Input
                            value={size.name}
                            onChange={(e) => handleUpdateSize(size.id, { name: e.target.value })}
                            className="w-32"
                            placeholder="Size name"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={(size.price_cents / 100).toFixed(2)}
                              onChange={(e) => handleUpdateSize(size.id, { 
                                price_cents: Math.round(parseFloat(e.target.value) * 100) 
                              })}
                              className="w-24"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Default</Label>
                            <Switch
                              checked={size.is_default}
                              onCheckedChange={(v) => handleUpdateSize(size.id, { is_default: v })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingSize(size);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAllSizes(item.id)}
                          disabled={savingId === item.id}
                        >
                          Remove All Sizes
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Items without sizes */}
      {itemsWithoutSizes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Add Sizes to Items</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Select items that should have size options
          </p>

          <div className="grid gap-2">
            {itemsWithoutSizes.slice(0, 10).map(item => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} • ${((item.price_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSizes(item.id, COMMON_SIZE_TEMPLATES)}
                      disabled={savingId === item.id}
                    >
                      {savingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "S / M / L"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSizes(item.id, ALT_SIZE_TEMPLATES)}
                      disabled={savingId === item.id}
                    >
                      Personal / Family
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {itemsWithoutSizes.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {itemsWithoutSizes.length - 10} more items
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {menuItems?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Scale className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Add menu items first, then you can add size options to them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this size?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the "{deletingSize?.name}" size option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSize}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
