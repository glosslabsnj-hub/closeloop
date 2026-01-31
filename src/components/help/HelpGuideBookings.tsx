import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Bell,
  ArrowRight,
  CalendarDays,
  Settings,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HelpGuideBookingsProps {
  mode: BusinessMode;
  searchQuery?: string;
}

export function HelpGuideBookings({ mode, searchQuery = "" }: HelpGuideBookingsProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "How Bookings Work",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When your AI takes a call, it can schedule appointments based on your availability. 
            Bookings appear here for you to confirm, reschedule, or cancel.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <CalendarDays className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">AI Scheduling</h4>
              <p className="text-sm text-muted-foreground">
                Your AI checks your availability and suggests open slots
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Instant Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Get notified immediately when new bookings come in
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "calendar-view",
      title: "Using the Calendar View",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The calendar shows all your appointments for the selected date. Click any date 
            to see that day's bookings.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Calendar features:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Date picker</strong> - Click any date to view appointments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Status badges</strong> - See confirmed, pending, or cancelled at a glance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Quick actions</strong> - Confirm, cancel, or edit directly</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "booking-statuses",
      title: "Understanding Booking Statuses",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Each booking has a status that shows where it is in the process:
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium">Pending Deposit</h4>
                <p className="text-sm text-muted-foreground">
                  Customer hasn't paid yet. Send reminder or follow up.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Confirmed</h4>
                <p className="text-sm text-muted-foreground">
                  Deposit paid and appointment is locked in.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h4 className="font-medium">Cancelled</h4>
                <p className="text-sm text-muted-foreground">
                  Appointment was cancelled by you or the customer.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "deposits",
      title: "Deposits & Payments",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Require deposits to reduce no-shows and secure bookings.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Setting up deposits
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Go to <strong>Settings → Booking Delivery</strong></li>
              <li>2. Enable <strong>Require Deposit</strong></li>
              <li>3. Set the deposit amount (flat or percentage)</li>
              <li>4. Connect your Stripe account to receive payments</li>
            </ol>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Go to Settings
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "availability",
      title: "Setting Your Availability",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your AI only offers time slots when you're available. Set your hours so customers 
            can only book when you're working.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">To set your hours:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Go to <strong>Settings → Hours</strong></li>
              <li>2. Set your working hours for each day</li>
              <li>3. Mark days off or holidays as unavailable</li>
              <li>4. Your AI will automatically respect these hours</li>
            </ol>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/settings" className="gap-2">
              <Clock className="h-4 w-4" />
              Set Business Hours
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
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Bookings & Calendar</CardTitle>
              <CardDescription>
                Manage appointments and scheduling
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
