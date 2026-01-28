import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Phone, Calendar, TrendingUp } from "lucide-react";

interface QuickStatsCardProps {
  callsAnswered?: number;
  bookingsThisWeek?: number;
  revenueRecovered?: number;
}

export function QuickStatsCard({ 
  callsAnswered = 47, 
  bookingsThisWeek = 18,
  revenueRecovered = 12400 
}: QuickStatsCardProps) {
  const stats = [
    {
      label: "Calls Answered",
      value: callsAnswered,
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Bookings",
      value: bookingsThisWeek,
      icon: Calendar,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Revenue",
      value: `$${revenueRecovered.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${stat.bgColor} mb-2`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
