import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Truck,
  AlertCircle,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Users,
  ArrowRight,
  Bell,
  Zap,
} from "lucide-react";

interface HelpGuideDispatchProps {
  searchQuery?: string;
}

export function HelpGuideDispatch({ searchQuery = "" }: HelpGuideDispatchProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "How Dispatch Works",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When customers call for service (towing, plumbing, HVAC, etc.), your AI collects 
            their location and problem details, then creates a dispatch job for your team.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Phone className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">AI Intake</h4>
              <p className="text-sm text-muted-foreground">
                AI collects location, problem description, and urgency level
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <AlertCircle className="h-5 w-5 text-destructive mb-2" />
              <h4 className="font-medium mb-1">Priority Queue</h4>
              <p className="text-sm text-muted-foreground">
                Urgent jobs surface to the top automatically
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "job-queue",
      title: "Managing the Job Queue",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The dispatch queue shows all pending and active jobs. Jobs are sorted by priority 
            and arrival time.
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-lg border bg-destructive/10 border-destructive/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-destructive">Urgent</h4>
                <p className="text-sm text-muted-foreground">
                  Emergency situations - dispatch immediately
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400">High Priority</h4>
                <p className="text-sm text-muted-foreground">
                  Time-sensitive - handle within the hour
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Normal</h4>
                <p className="text-sm text-muted-foreground">
                  Standard requests - schedule as capacity allows
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "job-workflow",
      title: "Job Status Workflow",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Update job status as your team progresses through the work:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-lg bg-muted/30">
            <span className="px-3 py-1 rounded-full bg-muted text-sm">Pending</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">Assigned</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm">En Route</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">On Site</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm">Completed</span>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-2">To update a job:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Find the job in the queue</li>
              <li>2. Click the status dropdown</li>
              <li>3. Select the new status</li>
              <li>4. Add notes if needed</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "assigning-crew",
      title: "Assigning Crew & Vehicles",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Assign technicians and vehicles to jobs for better tracking and communication.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Users className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Crew Assignment</h4>
              <p className="text-sm text-muted-foreground">
                Assign one or more technicians to handle the job
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Truck className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Vehicle Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Associate a vehicle for dispatch coordination
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "urgent-alerts",
      title: "Urgent Job Alerts",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Get instant alerts when urgent jobs come in so you never miss an emergency.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Alert options
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>SMS alerts</strong> - Text your dispatch phone for urgent jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Email alerts</strong> - Email notifications for all new jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Webhook</strong> - Push to your dispatch software</span>
              </li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/settings" className="gap-2">
              Configure Alerts
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
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Dispatch & Jobs</CardTitle>
              <CardDescription>
                Handle service requests and job assignments
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
