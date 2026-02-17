import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone, DollarSign, TrendingUp, Percent, Wallet } from "lucide-react";
import type { AgencyMetrics } from "@/hooks/useAgencyData";

interface AgencyOverviewProps {
  metrics: AgencyMetrics | null | undefined;
  isLoading: boolean;
  commissionThisMonthCents?: number;
  commissionRate?: number;
}

export function AgencyOverview({ metrics, isLoading, commissionThisMonthCents = 0, commissionRate }: AgencyOverviewProps) {
  const cards = [
    {
      label: "Active Clients",
      value: metrics?.total_clients ?? 0,
      format: "number" as const,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Calls (30 days)",
      value: metrics?.total_calls_30d ?? 0,
      format: "number" as const,
      icon: Phone,
      color: "text-emerald-600",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Revenue (30 days)",
      value: metrics?.total_revenue_30d_cents ?? 0,
      format: "currency" as const,
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Commission (This Month)",
      value: commissionThisMonthCents,
      format: "currency" as const,
      icon: Wallet,
      color: "text-teal-600",
      bg: "bg-teal-100 dark:bg-teal-900/30",
    },
    {
      label: "Commission Rate",
      value: commissionRate ?? 0.20,
      format: "percent" as const,
      icon: Percent,
      color: "text-indigo-600",
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      label: "Conversion Rate",
      value: metrics?.conversion_rate ?? 0,
      format: "percent" as const,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  const formatValue = (value: number, format: "number" | "currency" | "percent") => {
    if (format === "currency") return `$${(value / 100).toLocaleString()}`;
    if (format === "percent") return `${Math.round(value * 100)}%`;
    return value.toLocaleString();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  {isLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-lg font-bold">{formatValue(card.value, card.format)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
