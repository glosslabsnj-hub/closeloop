import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneMissed,
  Calendar,
  DollarSign,
  Bot,
  Clock,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { AgentStatusBanner } from "./AgentStatusBanner";

// Demo data for the dashboard
const demoMetrics = {
  aiCallsAnswered: 47,
  missedCallsRecovered: 23,
  bookingsThisWeek: 18,
  depositsCollected: 2850,
  revenueRecovered: 12400,
  avgResponseTime: 8,
  textssentToday: 34,
};

const recentActivity = [
  { type: "call", name: "John D.", action: "AI answered call", outcome: "Booked", time: "5m ago" },
  { type: "missed", name: "Sarah M.", action: "Missed call recovered", outcome: "Qualified", time: "12m ago" },
  { type: "booking", name: "Mike T.", action: "Appointment confirmed", outcome: "$150 deposit", time: "25m ago" },
  { type: "call", name: "Lisa K.", action: "AI answered call", outcome: "Follow-up", time: "1h ago" },
  { type: "missed", name: "Tom B.", action: "Missed call recovered", outcome: "Booked", time: "2h ago" },
];

const quickLinks = [
  { icon: Phone, label: "Inbox", href: "/app/inbox", description: "View conversations" },
  { icon: Calendar, label: "Bookings", href: "/app/bookings", description: "Manage appointments" },
  { icon: Bot, label: "AI Settings", href: "/app/ai-assistant", description: "Configure your agent" },
  { icon: MessageSquare, label: "Automations", href: "/app/automations", description: "SMS templates" },
];

export function LiveDashboard() {
  const { tenant } = useAuth();

  return (
    <div className="space-y-6">
      {/* Agent Status Banner */}
      <AgentStatusBanner />

      {/* Revenue Banner */}
      <Card className="bg-primary text-primary-foreground overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm opacity-90 mb-1">Revenue Recovered This Month</p>
              <p className="text-4xl font-bold">${demoMetrics.revenueRecovered.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2 text-sm opacity-90">
                <TrendingUp className="h-4 w-4" />
                <span>+23% from last month</span>
              </div>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <DollarSign className="h-10 w-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoMetrics.aiCallsAnswered}</p>
                <p className="text-xs text-muted-foreground">AI Calls Answered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <PhoneMissed className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoMetrics.missedCallsRecovered}</p>
                <p className="text-xs text-muted-foreground">Calls Recovered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoMetrics.bookingsThisWeek}</p>
                <p className="text-xs text-muted-foreground">Bookings This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoMetrics.textssentToday}</p>
                <p className="text-xs text-muted-foreground">Texts Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest leads and interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      activity.type === "call" ? "bg-primary/10" :
                      activity.type === "missed" ? "bg-warning/10" :
                      "bg-success/10"
                    }`}>
                      {activity.type === "call" ? (
                        <Phone className="h-4 w-4 text-primary" />
                      ) : activity.type === "missed" ? (
                        <PhoneMissed className="h-4 w-4 text-warning" />
                      ) : (
                        <Calendar className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activity.name}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.outcome}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Button
                  key={link.label}
                  variant="outline"
                  className="h-auto py-4 flex-col items-start gap-1 text-left"
                  asChild
                >
                  <a href={link.href}>
                    <div className="flex items-center gap-2 w-full">
                      <link.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{link.label}</span>
                      <ArrowUpRight className="h-3 w-3 ml-auto text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">
                      {link.description}
                    </span>
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
