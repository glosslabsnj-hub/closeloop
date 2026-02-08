/**
 * Food Service Types Editor
 * 
 * Quick toggle for what order types the restaurant offers.
 * This MUST be configured first before Coverage settings make sense.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, ShoppingBag, Utensils, Users, Info } from "lucide-react";
import { toast } from "sonner";

interface FoodOrderSettings {
  tenant_id: string;
  accepts_pickup: boolean;
  accepts_delivery: boolean;
  accepts_dine_in: boolean;
  accepts_catering: boolean;
}

const SERVICE_TYPES = [
  {
    key: "accepts_dine_in" as const,
    label: "Dine-In",
    description: "Customers eat at your location",
    icon: Utensils,
  },
  {
    key: "accepts_pickup" as const,
    label: "Pickup / Takeout",
    description: "Customers order ahead and pick up",
    icon: ShoppingBag,
  },
  {
    key: "accepts_delivery" as const,
    label: "Delivery",
    description: "You deliver to customers",
    icon: Truck,
    showsCoverage: true,
  },
  {
    key: "accepts_catering" as const,
    label: "Catering & Private Events",
    description: "Large orders for events and parties",
    icon: Users,
    showsCoverage: true,
  },
];

export function FoodServiceTypesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["food-order-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("food_order_settings")
        .select("accepts_pickup, accepts_delivery, accepts_dine_in, accepts_catering, tenant_id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as FoodOrderSettings | null;
    },
    enabled: !!tenant?.id,
  });

  const effectiveSettings = useMemo(() => ({
    accepts_dine_in: settings?.accepts_dine_in ?? true,
    accepts_pickup: settings?.accepts_pickup ?? true,
    accepts_delivery: settings?.accepts_delivery ?? false,
    accepts_catering: settings?.accepts_catering ?? false,
  }), [settings]);

  const handleToggle = async (key: keyof typeof effectiveSettings, value: boolean) => {
    if (!tenant?.id) return;

    try {
      const payload = {
        tenant_id: tenant.id,
        ...effectiveSettings,
        [key]: value,
      };

      const { error } = await supabase
        .from("food_order_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;

      toast.success(`${value ? "Enabled" : "Disabled"} ${SERVICE_TYPES.find(s => s.key === key)?.label}`);
      queryClient.invalidateQueries({ queryKey: ["food-order-settings"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const needsCoverage = effectiveSettings.accepts_delivery || effectiveSettings.accepts_catering;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">How does your business serve customers?</p>
            <p className="text-sm text-muted-foreground">
              Toggle on the service types you offer. Enabling <strong>Delivery</strong> or <strong>Catering</strong> will 
              unlock coverage area settings so your AI knows where you can serve.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {SERVICE_TYPES.map(({ key, label, description, icon: Icon, showsCoverage }) => (
            <div 
              key={key} 
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{label}</p>
                    {showsCoverage && effectiveSettings[key] && (
                      <Badge variant="secondary" className="text-xs">
                        Coverage Settings Available
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={effectiveSettings[key]}
                onCheckedChange={(v) => handleToggle(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {needsCoverage && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-primary">
            <strong>Next step:</strong> Go to the <strong>Coverage & ETA</strong> tab to configure where you deliver or cater.
          </p>
        </div>
      )}
    </div>
  );
}
