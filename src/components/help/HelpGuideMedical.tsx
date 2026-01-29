import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Stethoscope,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  ArrowRight,
  Lock,
  Phone,
} from "lucide-react";

interface HelpGuideMedicalProps {
  searchQuery?: string;
}

export function HelpGuideMedical({ searchQuery = "" }: HelpGuideMedicalProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "How Patient Intake Works",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When patients call, your AI collects basic information, reason for visit, and 
            preferred appointment times - all while maintaining HIPAA compliance.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Phone className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">AI Intake</h4>
              <p className="text-sm text-muted-foreground">
                Collects reason for visit, insurance, and preferred times
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <ShieldCheck className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">HIPAA Compliant</h4>
              <p className="text-sm text-muted-foreground">
                No PHI stored in transcripts or recordings by default
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "hipaa",
      title: "HIPAA Compliance",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">HIPAA Mode is Active</p>
              <p className="text-sm text-muted-foreground">
                Your practice data is protected with enhanced security
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">What HIPAA mode does:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>No recordings stored</strong> - Call audio is not retained</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>No transcripts stored</strong> - Only structured intake data is saved</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Minimized PHI</strong> - Only essential information is collected</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Auto-purge</strong> - Data retention policies automatically applied</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "intake-queue",
      title: "Managing the Intake Queue",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Medical Intake page shows all pending patient requests. Prioritize by urgency 
            and schedule appointments accordingly.
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-lg border bg-destructive/10 border-destructive/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-destructive">Urgent</h4>
                <p className="text-sm text-muted-foreground">
                  Patient described concerning symptoms - prioritize callback
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Routine</h4>
                <p className="text-sm text-muted-foreground">
                  Standard appointment request - schedule normally
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "intake-types",
      title: "Intake Types",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your AI categorizes intakes to help you prepare appropriately:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <FileText className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">New Patient</h4>
              <p className="text-sm text-muted-foreground">
                First-time patient needing new patient paperwork
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Calendar className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Follow-up</h4>
              <p className="text-sm text-muted-foreground">
                Existing patient requesting a follow-up visit
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "ai-summary",
      title: "AI-Generated Summaries",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            After each call, the AI generates a summary of the patient's request without 
            storing the full transcript (HIPAA compliant).
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Summary includes:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>General reason for visit (generalized, not specific symptoms)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Urgency level determination</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Preferred appointment dates/times</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Insurance information (if provided)</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "settings",
      title: "HIPAA Settings",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Configure your HIPAA compliance settings in the Settings page.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Available settings:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Store recordings</strong> - Only enable if BAA in place</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Store transcripts</strong> - Only enable if BAA in place</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Data retention</strong> - Auto-purge after X days</span>
              </li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/settings" className="gap-2">
              Go to HIPAA Settings
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
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Medical Intake</CardTitle>
              <CardDescription>
                Patient intake, HIPAA compliance, and scheduling
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
