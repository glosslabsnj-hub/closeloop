import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Truck, UtensilsCrossed, Cake } from "lucide-react";

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
}

interface FoodSetupEditorProps {
  data: FoodSetupData;
  onChange: (data: FoodSetupData) => void;
}

export function FoodSetupEditor({ data, onChange }: FoodSetupEditorProps) {
  const update = (field: keyof FoodSetupData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="order-types">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="order-types">Order Types</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="catering">Catering</TabsTrigger>
        </TabsList>

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
