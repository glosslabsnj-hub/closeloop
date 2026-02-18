import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone, DollarSign, Wallet } from "lucide-react";
import type { AgencyMetrics } from "@/hooks/useAgencyData";

interface AgencyOverviewProps {
  metrics: AgencyMetrics | null | undefined;
  isLoading: boolean;
  commissionThisMonthCents?: number;
  commissionRate?: number;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AgencyOverview({ metrics, isLoading, commissionThisMonthCents = 0, commissionRate }: AgencyOverviewProps) {
  const cards = [
    {
      label: "Active Clients",
      value: metrics?.total_clients ?? 0,
      display: (metrics?.total_clients ?? 0).toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Calls (30 days)",
      value: metrics?.total_calls_30d ?? 0,
      display: (metrics?.total_calls_30d ?? 0).toLocaleString(),
      icon: Phone,
      color: "text-emerald-600",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Client Revenue (30d)",
      value: metrics?.total_revenue_30d_cents ?? 0,
      display: formatCurrency(metrics?.total_revenue_30d_cents ?? 0),
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: `Commission This Month (${Math.round((commissionRate ?? 0.20) * 100)}%)`,
      value: commissionThisMonthCents,
      display: formatCurrency(commissionThisMonthCents),
      icon: Wallet,
      color: "text-teal-600",
      bg: "bg-teal-100 dark:bg-teal-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">{card.label}</p>
                  {isLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-lg font-bold truncate">{card.display}</p>
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
