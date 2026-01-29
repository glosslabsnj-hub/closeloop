import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Settings,
  Clock,
  Users,
  CreditCard,
  Bell,
  ArrowRight,
  CheckCircle2,
  Building,
} from "lucide-react";

interface HelpGuideSettingsProps {
  searchQuery?: string;
}

export function HelpGuideSettings({ searchQuery = "" }: HelpGuideSettingsProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "Settings Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Settings page lets you configure your business profile, hours, team access, 
            billing, and more.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Building className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Business Info</h4>
              <p className="text-sm text-muted-foreground">
                Name, address, contact details
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Clock className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Hours</h4>
              <p className="text-sm text-muted-foreground">
                When you're available for appointments
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Users className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Team</h4>
              <p className="text-sm text-muted-foreground">
                Invite staff and manage permissions
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <CreditCard className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Billing</h4>
              <p className="text-sm text-muted-foreground">
                Manage your subscription and payments
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "business",
      title: "Business Settings",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Keep your business information up to date. This is what your AI tells customers.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">What you can edit:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Business name</strong> - How your AI introduces itself</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Address</strong> - Location info for customers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Contact email</strong> - For notifications and reports</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Timezone</strong> - For accurate scheduling</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "hours",
      title: "Setting Business Hours",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your AI only offers appointments during your business hours. Set each day's 
            availability here.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">How to set hours:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                Go to Settings → Hours tab
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                Toggle each day on/off
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                Set start and end times
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                Click Save when done
              </li>
            </ol>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Your AI will tell callers when you're closed and offer to 
            take a message or schedule for when you're open.
          </p>
        </div>
      ),
    },
    {
      id: "team",
      title: "Managing Your Team",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Invite team members to help manage your account. Each person can have different 
            permission levels.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Team roles:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Owner</strong> - Full access, billing, and account deletion</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Admin</strong> - Manage settings, team, and content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Member</strong> - View and manage daily operations</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notification Preferences",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Control how and when you receive notifications about activity.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">In-App</h4>
              <p className="text-sm text-muted-foreground">
                See notifications in your dashboard
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Email</h4>
              <p className="text-sm text-muted-foreground">
                Get email alerts for important events
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "billing",
      title: "Billing & Subscription",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Manage your subscription, view usage, and update payment methods.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">What you can do:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>View your current plan and usage</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Upgrade or change your plan</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Update payment method</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Download invoices</span>
              </li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/usage" className="gap-2">
              View Usage
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
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
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Settings & Team</CardTitle>
              <CardDescription>
                Configure your account and manage team
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
