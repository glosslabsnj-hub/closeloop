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
  ArrowUpRight,
  Play,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Demo data for the dashboard
const demoMetrics = {
  aiCallsAnswered: 47,
  missedCallsRecovered: 23,
  bookingsThisWeek: 18,
  depositsCollected: 2850,
  revenueRecovered: 12400,
  avgResponseTime: 8,
};

const recentActivity = [
  { type: "call", name: "John D.", action: "AI answered call", outcome: "Booked", time: "5m ago" },
  { type: "missed", name: "Sarah M.", action: "Missed call recovered", outcome: "Qualified", time: "12m ago" },
  { type: "booking", name: "Mike T.", action: "Appointment confirmed", outcome: "$150 deposit", time: "25m ago" },
  { type: "call", name: "Lisa K.", action: "AI answered call", outcome: "Follow-up", time: "1h ago" },
  { type: "missed", name: "Tom B.", action: "Missed call recovered", outcome: "Booked", time: "2h ago" },
];

export default function DashboardPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [simulating, setSimulating] = useState(false);

  const handleTestSimulator = async () => {
    setSimulating(true);
    
    // Simulate a missed call scenario
    try {
      if (tenant) {
        // Create a test lead
        const { data: lead, error } = await supabase
          .from("leads")
          .insert({
            tenant_id: tenant.id,
            full_name: "Test Customer",
            phone: "+1 555-0123",
            source: "missed_call",
            status: "new",
          })
          .select()
          .single();

        if (!error && lead) {
          // Create a conversation
          await supabase.from("conversations").insert({
            tenant_id: tenant.id,
            lead_id: lead.id,
            channel: "sms",
          });

          // Create a test message
          await supabase.from("messages").insert({
            tenant_id: tenant.id,
            conversation_id: lead.id,
            direction: "outbound",
            body: "Hi! We noticed we missed your call. How can we help you today?",
            status: "sent",
          });
        }
      }

      toast({
        title: "🎉 Test Complete!",
        description: "A missed call was simulated. Check your Inbox to see the automated response.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Simulation failed",
        description: "Please try again.",
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {tenant?.name || "there"}!
          </p>
        </div>
        <Button onClick={handleTestSimulator} disabled={simulating} className="gap-2">
          <Play className="h-4 w-4" />
          {simulating ? "Simulating..." : "Test CloseLoop"}
        </Button>
      </div>

      {/* Revenue Banner */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
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
                <p className="text-xs text-muted-foreground">Missed Calls Recovered</p>
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
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoMetrics.avgResponseTime}s</p>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
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
                        <Phone className={`h-4 w-4 text-primary`} />
                      ) : activity.type === "missed" ? (
                        <PhoneMissed className={`h-4 w-4 text-warning`} />
                      ) : (
                        <Calendar className={`h-4 w-4 text-success`} />
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Phone, label: "View Inbox", href: "/app/inbox" },
                { icon: Calendar, label: "Bookings", href: "/app/bookings" },
                { icon: Bot, label: "AI Settings", href: "/app/ai-assistant" },
                { icon: DollarSign, label: "Deposits", href: "/app/settings" },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  asChild
                >
                  <a href={action.href}>
                    <action.icon className="h-5 w-5" />
                    <span className="text-sm">{action.label}</span>
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
