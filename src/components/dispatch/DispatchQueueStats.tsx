import { Clock, User, Navigation, MapPin, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DispatchJob {
  status: string;
  completed_at?: string | null;
}

interface DispatchQueueStatsProps {
  jobs: DispatchJob[];
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}

export function DispatchQueueStats({ jobs }: DispatchQueueStatsProps) {
  const stats: StatItem[] = [
    {
      label: "Pending",
      value: jobs.filter((j) => j.status === "pending").length,
      icon: Clock,
      colorClass: "text-warning",
    },
    {
      label: "Assigned",
      value: jobs.filter((j) => j.status === "assigned").length,
      icon: User,
      colorClass: "text-primary",
    },
    {
      label: "En Route",
      value: jobs.filter((j) => j.status === "en_route").length,
      icon: Navigation,
      colorClass: "text-info",
    },
    {
      label: "On Site",
      value: jobs.filter((j) => j.status === "on_site").length,
      icon: MapPin,
      colorClass: "text-success",
    },
    {
      label: "Completed Today",
      value: jobs.filter(
        (j) =>
          j.status === "completed" &&
          j.completed_at &&
          new Date(j.completed_at).toDateString() === new Date().toDateString()
      ).length,
      icon: CheckCircle2,
      colorClass: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn("h-4 w-4", stat.colorClass)} />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
