import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Zap, Phone, Clock, MessageSquare, Calendar } from "lucide-react";

const demoAutomations = [
  {
    id: "1",
    name: "Missed Call Follow-up",
    trigger: "missed_call",
    isEnabled: true,
    steps: [
      { type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" },
      { type: "wait_minutes", minutes: 10 },
      { type: "send_message", body: "We'd love to help! Would you like to schedule an appointment?" },
    ],
  },
  {
    id: "2",
    name: "Booking Confirmation",
    trigger: "booking_created",
    isEnabled: true,
    steps: [
      { type: "send_message", body: "Your appointment is confirmed! We'll see you on {date} at {time}." },
    ],
  },
  {
    id: "3",
    name: "24-Hour No Reply",
    trigger: "no_reply_24h",
    isEnabled: false,
    steps: [
      { type: "send_message", body: "Just checking in! Let us know if you're still interested in booking." },
    ],
  },
  {
    id: "4",
    name: "Post-Service Review Request",
    trigger: "booking_completed",
    isEnabled: true,
    steps: [
      { type: "wait_minutes", minutes: 60 },
      { type: "send_message", body: "Thank you for choosing us! We'd love your feedback. Reply with a rating 1-5!" },
    ],
  },
];

const triggerLabels: Record<string, string> = {
  missed_call: "Missed Call",
  new_lead: "New Lead",
  no_reply_10m: "No Reply (10 min)",
  no_reply_24h: "No Reply (24 hours)",
  booking_created: "Booking Created",
  booking_completed: "Booking Completed",
};

const triggerIcons: Record<string, typeof Phone> = {
  missed_call: Phone,
  new_lead: MessageSquare,
  no_reply_10m: Clock,
  no_reply_24h: Clock,
  booking_created: Calendar,
  booking_completed: Calendar,
};

export default function AutomationsPage() {
  const { tenant } = useAuth();
  const [automations, setAutomations] = useState(demoAutomations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<typeof demoAutomations[0] | null>(null);

  const toggleAutomation = (id: string) => {
    setAutomations(
      automations.map((a) =>
        a.id === id ? { ...a, isEnabled: !a.isEnabled } : a
      )
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">Automate follow-ups and communications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setEditingAutomation(null)}>
              <Plus className="h-4 w-4" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAutomation ? "Edit Automation" : "Create Automation"}</DialogTitle>
              <DialogDescription>
                Set up automated messages and actions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Automation Name</Label>
                <Input placeholder="Missed Call Follow-up" defaultValue={editingAutomation?.name} />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select defaultValue={editingAutomation?.trigger || "missed_call"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Hi! We noticed we missed your call..."
                  rows={3}
                  defaultValue={editingAutomation?.steps[0]?.body}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{name}"}, {"{date}"}, {"{time}"} for dynamic values
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                {editingAutomation ? "Save Changes" : "Create Automation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Active Automations", value: automations.filter((a) => a.isEnabled).length },
          { label: "Messages Sent Today", value: 47 },
          { label: "Leads Recovered", value: 23 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Automations Grid */}
      <div className="grid gap-4">
        {automations.map((automation) => {
          const TriggerIcon = triggerIcons[automation.trigger] || Zap;
          return (
            <Card key={automation.id} className={!automation.isEnabled ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <TriggerIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{automation.name}</h3>
                        <Badge variant="secondary">{triggerLabels[automation.trigger]}</Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        {automation.steps.map((step, i) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            {step.type === "wait_minutes"
                              ? `⏱ Wait ${step.minutes} minutes`
                              : `📨 "${step.body?.substring(0, 50)}..."`}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAutomation(automation);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={automation.isEnabled}
                      onCheckedChange={() => toggleAutomation(automation.id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
