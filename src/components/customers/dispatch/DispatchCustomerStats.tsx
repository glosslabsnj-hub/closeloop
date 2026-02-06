/**
 * Dispatch Customer Stats Bar
 * 
 * Quick overview stats for dispatch customers
 */

import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Shield, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DispatchCustomerStatsProps {
  stats: {
    total: number;
    individuals: number;
    commercial: number;
    insurance: number;
    totalRevenue: number;
  };
}

export function DispatchCustomerStats({ stats }: DispatchCustomerStatsProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const statItems = [
    {
      label: "Total Customers",
      value: stats.total,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: "Commercial",
      value: stats.commercial,
      icon: Building2,
      color: "text-blue-500",
    },
    {
      label: "Insurance/Motor Club",
      value: stats.insurance,
      icon: Shield,
      color: "text-emerald-500",
    },
    {
      label: "Lifetime Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      color: "text-primary",
      isLarge: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-muted", item.color)}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className={cn(
                  "font-semibold",
                  item.isLarge ? "text-lg" : "text-xl"
                )}>
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
