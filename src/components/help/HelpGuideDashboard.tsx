import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  Users,
  Calendar,
  Truck,
  UtensilsCrossed,
  Stethoscope,
  Bell,
  ToggleLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  PhoneCall,
} from "lucide-react";
import { useBusinessAwareness, type BusinessAwareness } from "@/hooks/useBusinessAwareness";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HelpGuideDashboardProps {
  mode: BusinessMode;
  searchQuery?: string;
}

function prioritizeSections(
  sections: { id: string; title: string; content: React.ReactNode }[],
  awareness: BusinessAwareness,
) {
  const priorityIds: string[] = [];

  // Prioritize agent-control when no calendar but booking enabled
  if (!awareness.hasCalendar && awareness.caps.hasBooking) {
    priorityIds.push("agent-control");
  }
  // Prioritize overview if very new
  if (awareness.isNewBusiness) {
    priorityIds.push("overview");
  }

  if (priorityIds.length === 0) return sections;

  const prioritized = sections.filter((s) => priorityIds.includes(s.id));
  const rest = sections.filter((s) => !priorityIds.includes(s.id));
  return [...prioritized, ...rest];
}

export function HelpGuideDashboard({ mode, searchQuery = "" }: HelpGuideDashboardProps) {
  const awareness = useBusinessAwareness();
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getModeSpecificContent = () => {
    switch (mode) {
      case "service":
        return {
          primary: "Bookings",
          primaryDesc: "View pending and confirmed appointments",
          icon: Calendar,
          link: "/app/bookings",
        };
      case "dispatch":
        return {
          primary: "Dispatch Queue",
          primaryDesc: "View urgent jobs and pending dispatch requests",
          icon: Truck,
          link: "/app/dispatch",
        };
      case "food":
        return {
          primary: "Orders",
          primaryDesc: "View active kitchen orders and order status",
          icon: UtensilsCrossed,
          link: "/app/orders",
        };
      case "medical":
        return {
          primary: "Patient Intake",
          primaryDesc: "View pending intake forms and urgent requests",
          icon: Stethoscope,
          link: "/app/medical-intake",
        };
      default:
        return {
          primary: "Leads",
          primaryDesc: "View and manage incoming leads",
          icon: Users,
          link: "/app/leads",
        };
    }
  };

  const modeContent = getModeSpecificContent();
  const ModeIcon = modeContent.icon;

  const sections = [
    {
      id: "overview",
      title: "Dashboard Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your dashboard is the command center for your AI assistant. Here you can monitor 
            activity, control your AI, and quickly access important features.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <ToggleLeft className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Agent Control</h4>
              <p className="text-sm text-muted-foreground">
                Turn your AI on/off, set busy mode, or pause for breaks
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <ModeIcon className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">{modeContent.primary}</h4>
              <p className="text-sm text-muted-foreground">{modeContent.primaryDesc}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <PhoneCall className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Call Stats</h4>
              <p className="text-sm text-muted-foreground">
                See how many calls your AI handled today
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Get alerts for urgent items and new activity
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "agent-control",
      title: "Controlling Your AI Agent",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Agent Control card lets you manage when and how your AI handles calls.
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Go Live</h4>
                <p className="text-sm text-muted-foreground">
                  When enabled, your AI answers all incoming calls. Toggle off to stop the AI 
                  from answering while you make changes.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Busy Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Temporarily pause your AI. Perfect for lunch breaks or when you want to 
                  answer calls yourself.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "quick-links",
      title: "Quick Navigation",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Quick Links section gives you fast access to your most-used pages.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a href="/app/inbox" className="gap-2">
                <MessageSquare className="h-4 w-4" /> Inbox
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a href={modeContent.link} className="gap-2">
                <ModeIcon className="h-4 w-4" /> {modeContent.primary}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a href="/app/leads" className="gap-2">
                <Users className="h-4 w-4" /> Leads
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a href="/app/calls" className="gap-2">
                <Phone className="h-4 w-4" /> Calls
              </a>
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Understanding Notifications",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The notification bell in the top right shows important alerts that need your attention.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Types of notifications:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>New bookings/orders</strong> - Items waiting for confirmation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Knowledge conflicts</strong> - AI found conflicting information</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Urgent items</strong> - High-priority requests needing attention</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Usage alerts</strong> - Approaching plan limits</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "sidebar",
      title: "Sidebar Navigation",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The sidebar (desktop) or bottom nav (mobile) gives you access to all features. 
            Items shown depend on your business mode.
          </p>
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-3">Your available pages:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                <span>Dashboard - Overview and quick stats</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Inbox - All conversations in one place</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>Calls - View call history and transcripts</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Leads - Customer database and CRM</span>
              </li>
              <li className="flex items-center gap-2">
                <ModeIcon className="h-4 w-4 text-muted-foreground" />
                <span>{modeContent.primary} - Your primary workflow</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  // Apply business-aware prioritization + search filter
  const prioritized = prioritizeSections(sections, awareness);
  const filteredSections = prioritized.filter(s => matchesSearch(s.title));

  // Default open section: if no FAQs, open agent-control; otherwise overview
  const defaultSection = awareness.faqCount === 0 ? "agent-control" : "overview";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Learn your way around the dashboard
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue={defaultSection} className="w-full">
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
