import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneMissed, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const recentActivity = [
  { type: "call", name: "John D.", action: "AI answered call", outcome: "Booked", time: "5m ago" },
  { type: "missed", name: "Sarah M.", action: "Missed call recovered", outcome: "Qualified", time: "12m ago" },
  { type: "booking", name: "Mike T.", action: "Appointment confirmed", outcome: "$150 deposit", time: "25m ago" },
  { type: "call", name: "Lisa K.", action: "AI answered call", outcome: "Follow-up", time: "1h ago" },
];

export function RecentActivityCard() {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-3.5 w-3.5 text-primary" />;
      case "missed":
        return <PhoneMissed className="h-3.5 w-3.5 text-warning" />;
      case "booking":
        return <Calendar className="h-3.5 w-3.5 text-success" />;
      default:
        return <Phone className="h-3.5 w-3.5" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-primary/10";
      case "missed":
        return "bg-warning/10";
      case "booking":
        return "bg-success/10";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 text-xs h-8"
          onClick={() => navigate("/app/inbox")}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivity.map((activity, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${getBgColor(activity.type)}`}>
                  {getIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{activity.outcome}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
