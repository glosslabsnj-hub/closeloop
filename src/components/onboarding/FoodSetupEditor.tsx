import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Truck, UtensilsCrossed, Cake, Plus, X, Sparkles, ArrowRight } from "lucide-react";

export interface FoodSetupData {
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  acceptsDineIn: boolean;
  deliveryRadius: number;
  deliveryMinimumCents: number;
  estimatedPrepMinutes: number;
  busyBufferMinutes: number;
  deliveryWindowMin: number;
  deliveryWindowMax: number;
  acceptsCatering: boolean;
  cateringMinGuests: number;
  cateringLeadDays: number;
  menuNotes: string;
  quickMenuItems?: QuickMenuItem[];
}

export interface QuickMenuItem {
  name: string;
  price: number;
  category: string;
}

interface FoodSetupEditorProps {
  data: FoodSetupData;
  onChange: (data: FoodSetupData) => void;
}

const COMMON_CATEGORIES = ["Appetizers", "Mains", "Sides", "Desserts", "Drinks", "Specials"];

export function FoodSetupEditor({ data, onChange }: FoodSetupEditorProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Mains");

  const update = (field: keyof FoodSetupData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addMenuItem = () => {
    if (!newItemName.trim()) return;
    
    const newItem: QuickMenuItem = {
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      category: newItemCategory,
    };

    const currentItems = data.quickMenuItems || [];
    update("quickMenuItems", [...currentItems, newItem]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const removeMenuItem = (index: number) => {
    const currentItems = data.quickMenuItems || [];
    update("quickMenuItems", currentItems.filter((_, i) => i !== index));
  };

  const menuItems = data.quickMenuItems || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="menu">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="order-types">Order Types</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="catering">Catering</TabsTrigger>
        </TabsList>

        {/* Menu Quick-Add Tab */}
        <TabsContent value="menu" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Menu Setup
              </CardTitle>
              <CardDescription>
                Add a few menu items now so your AI can answer customer questions. You can add more later in the Menu Center.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new item form */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Input
                    placeholder="Item name (e.g., Cheeseburger)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addMenuItem()}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addMenuItem()}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="col-span-3">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={addMenuItem}
                    className="w-full"
                    disabled={!newItemName.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Display added items */}
              {menuItems.length > 0 ? (
                <div className="space-y-2">
                  {menuItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                          {item.category}
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMenuItem(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <UtensilsCrossed className="h-4 w-4" />
                  <AlertDescription>
                    Add at least 3-5 menu items so your AI can intelligently answer questions about your food, pricing, and recommendations.
                  </AlertDescription>
                </Alert>
              )}

              {menuItems.length > 0 && menuItems.length < 3 && (
                <p className="text-sm text-amber-600">
                  Add {3 - menuItems.length} more item{3 - menuItems.length > 1 ? "s" : ""} for best results
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order-types" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Dine-In</Label>
                    <p className="text-sm text-muted-foreground">Accept in-restaurant dining</p>
                  </div>
                </div>
                <Switch
                  checked={data.acceptsDineIn}
                  onCheckedChange={(v) => update("acceptsDineIn", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Pickup</Label>
                    <p className="text-sm text-muted-foreground">Accept pickup orders</p>
                  </div>
                </div>
                <Switch
                  checked={data.acceptsPickup}
                  onCheckedChange={(v) => update("acceptsPickup", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Delivery</Label>
                    <p className="text-sm text-muted-foreground">Accept delivery orders</p>
                  </div>
                </div>
                <Switch
                  checked={data.acceptsDelivery}
                  onCheckedChange={(v) => update("acceptsDelivery", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Prep Time (minutes)</Label>
                <Input
                  type="number"
                  value={data.estimatedPrepMinutes}
                  onChange={(e) => update("estimatedPrepMinutes", parseInt(e.target.value) || 15)}
                  min={5}
                  max={120}
                />
                <p className="text-xs text-muted-foreground">
                  Average time to prepare an order
                </p>
              </div>

              <div className="space-y-2">
                <Label>Busy Buffer (minutes)</Label>
                <Input
                  type="number"
                  value={data.busyBufferMinutes}
                  onChange={(e) => update("busyBufferMinutes", parseInt(e.target.value) || 30)}
                  min={0}
                  max={120}
                />
                <p className="text-xs text-muted-foreground">
                  Additional time added when you're very busy
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Delivery Radius (miles)</Label>
                <Input
                  type="number"
                  value={data.deliveryRadius}
                  onChange={(e) => update("deliveryRadius", parseInt(e.target.value) || 5)}
                  min={1}
                  max={50}
                  disabled={!data.acceptsDelivery}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Order for Delivery ($)</Label>
                <Input
                  type="number"
                  value={(data.deliveryMinimumCents / 100).toFixed(2)}
                  onChange={(e) => update("deliveryMinimumCents", Math.round(parseFloat(e.target.value) * 100) || 0)}
                  min={0}
                  step={0.01}
                  disabled={!data.acceptsDelivery}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Window (minutes)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      value={data.deliveryWindowMin}
                      onChange={(e) => update("deliveryWindowMin", parseInt(e.target.value) || 20)}
                      min={10}
                      max={120}
                      disabled={!data.acceptsDelivery}
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={data.deliveryWindowMax}
                      onChange={(e) => update("deliveryWindowMax", parseInt(e.target.value) || 40)}
                      min={10}
                      max={120}
                      disabled={!data.acceptsDelivery}
                      placeholder="Max"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expected delivery time range (e.g., 20-40 minutes)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catering" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cake className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Accept Catering</Label>
                    <p className="text-sm text-muted-foreground">Handle large event orders</p>
                  </div>
                </div>
                <Switch
                  checked={data.acceptsCatering}
                  onCheckedChange={(v) => update("acceptsCatering", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Guest Count</Label>
                <Input
                  type="number"
                  value={data.cateringMinGuests}
                  onChange={(e) => update("cateringMinGuests", parseInt(e.target.value) || 10)}
                  min={1}
                  disabled={!data.acceptsCatering}
                />
              </div>

              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input
                  type="number"
                  value={data.cateringLeadDays}
                  onChange={(e) => update("cateringLeadDays", parseInt(e.target.value) || 3)}
                  min={1}
                  disabled={!data.acceptsCatering}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum days notice required for catering orders
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label>Menu Notes for AI</Label>
        <Textarea
          placeholder="Any special notes about your menu the AI should know (e.g., 'We're known for our signature BBQ sauce' or 'All dishes can be made gluten-free upon request')"
          value={data.menuNotes}
          onChange={(e) => update("menuNotes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
