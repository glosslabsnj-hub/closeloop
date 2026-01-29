import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Zap,
  CheckCircle2,
  MessageSquare,
  Mail,
  Bell,
  Clock,
  ArrowRight,
  Settings,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HelpGuideAutomationsProps {
  mode: BusinessMode;
  searchQuery?: string;
}

export function HelpGuideAutomations({ mode, searchQuery = "" }: HelpGuideAutomationsProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getModeAutomationExamples = () => {
    switch (mode) {
      case "service":
        return [
          { trigger: "Booking Created", action: "Send confirmation SMS" },
          { trigger: "Booking Confirmed", action: "Send calendar invite" },
          { trigger: "24 Hours Before", action: "Send reminder" },
        ];
      case "dispatch":
        return [
          { trigger: "Job Created", action: "Notify dispatch team" },
          { trigger: "Urgent Job", action: "Send SMS alert to manager" },
          { trigger: "Job Completed", action: "Request review" },
        ];
      case "food":
        return [
          { trigger: "Order Placed", action: "Send confirmation" },
          { trigger: "Order Ready", action: "Notify customer" },
          { trigger: "Reservation Made", action: "Send confirmation" },
        ];
      case "medical":
        return [
          { trigger: "Intake Received", action: "Notify front desk" },
          { trigger: "Urgent Intake", action: "Alert clinical staff" },
          { trigger: "Appointment Scheduled", action: "Send forms" },
        ];
      default:
        return [
          { trigger: "New Lead", action: "Send welcome message" },
          { trigger: "Missed Call", action: "Follow-up SMS" },
        ];
    }
  };

  const sections = [
    {
      id: "overview",
      title: "What Are Automations?",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Automations let you set up automatic actions that happen when certain events occur - 
            like sending a confirmation text when someone books an appointment.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Zap className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Triggers</h4>
              <p className="text-sm text-muted-foreground">
                Events that start an automation (booking, call, etc.)
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <ArrowRight className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Actions</h4>
              <p className="text-sm text-muted-foreground">
                What happens automatically (send SMS, email, notify)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "examples",
      title: "Common Automations for Your Business",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Here are popular automations for your business type:
          </p>
          <div className="space-y-3">
            {getModeAutomationExamples().map((example, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{example.trigger}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground inline mx-2" />
                  <span className="text-sm text-muted-foreground">{example.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "action-types",
      title: "Available Actions",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Choose from these automatic actions:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <MessageSquare className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Send SMS</h4>
              <p className="text-sm text-muted-foreground">
                Text the customer or your team
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Mail className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Send Email</h4>
              <p className="text-sm text-muted-foreground">
                Email confirmations or notifications
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Internal Notify</h4>
              <p className="text-sm text-muted-foreground">
                Alert your team in the dashboard
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Clock className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Scheduled</h4>
              <p className="text-sm text-muted-foreground">
                Delay actions (e.g., remind 24h before)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "creating",
      title: "Creating an Automation",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Set up a new automation in just a few clicks:
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                Go to <strong>Automations</strong> page
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                Click <strong>Create Automation</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                Choose a trigger (what starts it)
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                Add actions (what happens)
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">5.</span>
                Toggle it on when ready
              </li>
            </ol>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/automations" className="gap-2">
              <Zap className="h-4 w-4" />
              Go to Automations
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "best-practices",
      title: "Best Practices",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Tips for effective automations:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Start simple</strong> - Begin with confirmation messages</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Test first</strong> - Try automations on yourself before going live</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Don't over-message</strong> - Customers don't want spam</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Use timing</strong> - Send reminders at appropriate times</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(s => matchesSearch(s.title));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Automations</CardTitle>
              <CardDescription>
                Set up automatic workflows and triggers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="overview" className="w-full">
            {filteredSections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>{section.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
