import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  Warehouse,
  Truck,
  ArrowUpDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function InventoryPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["job_tracking", "dispatch_queue"]);
  const {
    items,
    locations,
    stockLevels,
    lowStockItems,
    isLoading,
    createItem,
    createLocation,
    recordUsage,
    restock,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [stockActionOpen, setStockActionOpen] = useState(false);
  const [stockAction, setStockAction] = useState<"restock" | "usage">("restock");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemMinStock, setNewItemMinStock] = useState("5");

  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState<"warehouse" | "truck">("warehouse");

  const [stockLocationId, setStockLocationId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");

  const filteredItems = items.filter(
    (item) =>
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    await createItem.mutateAsync({
      name: newItemName,
      sku: newItemSku || undefined,
      category: newItemCategory || undefined,
      unit_cost_cents: newItemCost ? Math.round(parseFloat(newItemCost) * 100) : undefined,
      sell_price_cents: newItemPrice ? Math.round(parseFloat(newItemPrice) * 100) : undefined,
      min_stock_level: parseInt(newItemMinStock) || 5,
    });
    setAddItemOpen(false);
    resetItemForm();
  };

  const handleAddLocation = async () => {
    await createLocation.mutateAsync({
      name: newLocationName,
      location_type: newLocationType,
    });
    setAddLocationOpen(false);
    setNewLocationName("");
  };

  const handleStockAction = async () => {
    if (!selectedItem || !stockLocationId || !stockQuantity) return;

    if (stockAction === "restock") {
      await restock.mutateAsync({
        item_id: selectedItem.id,
        location_id: stockLocationId,
        quantity: parseInt(stockQuantity),
      });
    } else {
      await recordUsage.mutateAsync({
        item_id: selectedItem.id,
        location_id: stockLocationId,
        quantity: parseInt(stockQuantity),
      });
    }
    setStockActionOpen(false);
    setSelectedItem(null);
    setStockQuantity("");
  };

  const resetItemForm = () => {
    setNewItemName("");
    setNewItemSku("");
    setNewItemCategory("");
    setNewItemCost("");
    setNewItemPrice("");
    setNewItemMinStock("5");
  };

  const openStockAction = (item: InventoryItem, action: "restock" | "usage") => {
    setSelectedItem(item);
    setStockAction(action);
    setStockActionOpen(true);
  };

  const getStockForItem = (itemId: string): number => {
    return stockLevels
      .filter((s) => s.item_id === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  if (moduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    );
  }
  if (!isAllowed) {
    return (
      <ModuleUnavailablePage
        title="Parts Inventory Not Available"
        description="Parts inventory tracking requires the Parts Inventory module to be enabled for your account."
        moduleName="Parts Inventory"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading your inventory">
      <PageContainer maxWidth="xl">
        <PageHeader
          title="Inventory Management"
          description="Track parts, materials, and stock levels"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddLocationOpen(true)}>
                <Warehouse className="h-4 w-4 mr-2" />
                Add Location
              </Button>
              <Button onClick={() => setAddItemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locations</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations.length}</div>
              <p className="text-xs text-muted-foreground">
                {locations.filter((l) => l.location_type === "truck").length} trucks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">Items need restock</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  stockLevels.reduce((sum, s) => {
                    const item = items.find((i) => i.id === s.item_id);
                    return sum + s.quantity * (item?.unit_cost_cents || 0);
                  }, 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Parts Catalog</TabsTrigger>
            <TabsTrigger value="locations">Stock by Location</TabsTrigger>
            <TabsTrigger value="low-stock">
              Low Stock
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {lowStockItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Parts Catalog</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((item) => {
                      const totalStock = getStockForItem(item.id);
                      const isLowStock = totalStock <= item.min_stock_level;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-4 border rounded-lg",
                            isLowStock && "border-orange-300 bg-orange-50 dark:bg-orange-950/20"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{item.name}</p>
                                {item.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.sku}
                                  </Badge>
                                )}
                                {isLowStock && (
                                  <Badge variant="destructive">Low Stock</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.category || "Uncategorized"} • Cost: {formatCurrency(item.unit_cost_cents)} • Sell: {formatCurrency(item.sell_price_cents)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{totalStock}</p>
                              <p className="text-xs text-muted-foreground">in stock</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockAction(item, "restock")}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockAction(item, "usage")}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((location) => {
                const locationStock = stockLevels.filter((s) => s.location_id === location.id);
                const Icon = location.location_type === "truck" ? Truck : Warehouse;

                return (
                  <Card key={location.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <Badge variant="outline">{location.location_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {locationStock.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No items at this location</p>
                      ) : (
                        <div className="space-y-2">
                          {locationStock.map((stock) => {
                            const item = items.find((i) => i.id === stock.item_id);
                            if (!item) return null;
                            return (
                              <div
                                key={stock.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>{item.name}</span>
                                <Badge variant={stock.quantity <= item.min_stock_level ? "destructive" : "secondary"}>
                                  {stock.quantity}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="low-stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Items that need to be restocked</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    All items are adequately stocked
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lowStockItems.map((stock) => {
                      const item = stock.item;
                      const location = stock.location;
                      if (!item || !location) return null;

                      return (
                        <div
                          key={stock.id}
                          className="flex items-center justify-between p-4 border border-orange-300 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {location.name} • Min: {item.min_stock_level}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-600">{stock.quantity}</p>
                              <p className="text-xs text-muted-foreground">current</p>
                            </div>
                            <Button size="sm" onClick={() => openStockAction(item, "restock")}>
                              Restock
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new part or material to your catalog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Air Filter 16x20"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  placeholder="e.g., AF-16-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="e.g., Filters, Parts, Supplies"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Sell Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={newItemMinStock}
                  onChange={(e) => setNewItemMinStock(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!newItemName || createItem.isPending}>
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Location</DialogTitle>
            <DialogDescription>Add a warehouse or truck for inventory tracking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Main Warehouse, Truck #1"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newLocationType} onValueChange={(v) => setNewLocationType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLocation} disabled={!newLocationName || createLocation.isPending}>
              {createLocation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Action Dialog */}
      <Dialog open={stockActionOpen} onOpenChange={setStockActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAction === "restock" ? "Restock Item" : "Record Usage"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={stockLocationId} onValueChange={setStockLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockActionOpen(false)}>Cancel</Button>
            <Button
              onClick={handleStockAction}
              disabled={!stockLocationId || !stockQuantity || restock.isPending || recordUsage.isPending}
            >
              {(restock.isPending || recordUsage.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {stockAction === "restock" ? "Add Stock" : "Record Usage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
