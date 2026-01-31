import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Printer,
  Webhook,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { INDUSTRY_GUIDES, TROUBLESHOOTING_TIPS } from "@/data/workflowGuides";
import { VariableGuide } from "@/components/workflows/VariableGuide";
import { IntegrationGuide } from "@/components/workflows/IntegrationGuide";

interface HelpGuideWorkflowsProps {
  mode: BusinessMode;
  searchQuery?: string;
}

export function HelpGuideWorkflows({ mode, searchQuery = "" }: HelpGuideWorkflowsProps) {
  const guide = INDUSTRY_GUIDES[mode];
  const { toast } = useToast();
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const handleCopyMessage = (message: string, id: string) => {
    navigator.clipboard.writeText(message);
    setCopiedMessage(id);
    setTimeout(() => setCopiedMessage(null), 2000);
    toast({ title: "Message copied!" });
  };

  const sections = [
    {
      id: "how-it-works",
      title: "How Automations Work",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Automations run automatically when specific events happen in your business. Set them up once, and they work 24/7.
          </p>

          {/* Visual Flow */}
          <div className="flex items-center justify-center gap-2 p-6 rounded-lg bg-muted/50 border">
            <div className="text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs font-medium">Something Happens</p>
              <p className="text-xs text-muted-foreground">(Order placed, call ended)</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs font-medium">Automation Runs</p>
              <p className="text-xs text-muted-foreground">(Your workflow)</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs font-medium">Action Completed</p>
              <p className="text-xs text-muted-foreground">(SMS sent, ticket printed)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-card">
              <MessageSquare className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium">Send SMS</p>
              <p className="text-xs text-muted-foreground">Text customers or your team</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <Printer className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium">Print Ticket</p>
              <p className="text-xs text-muted-foreground">Auto-print order tickets</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <Webhook className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium">Push to CRM</p>
              <p className="text-xs text-muted-foreground">Sync with external tools</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "quick-start",
      title: `Quick Start for ${guide.title}`,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">{guide.description}</p>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Get Started in 5 Minutes
            </h4>
            <ol className="space-y-2">
              {guide.quickStartSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href="/app/workflows" className="gap-2">
              <Zap className="h-4 w-4" />
              Go to Automations
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "automations",
      title: "Step-by-Step Setup Guides",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Detailed instructions for each automation type available for your business:
          </p>

          <Accordion type="single" collapsible className="w-full">
            {guide.automations.map((automation) => (
              <AccordionItem key={automation.id} value={automation.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      {automation.primaryAction === "notify_sms" && <MessageSquare className="h-4 w-4 text-primary" />}
                      {automation.primaryAction === "print_ticket" && <Printer className="h-4 w-4 text-primary" />}
                      {automation.primaryAction === "webhook_push" && <Webhook className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{automation.title}</p>
                      <p className="text-xs text-muted-foreground font-normal">{automation.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-11 space-y-4">
                    {/* Setup Steps */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">HOW TO SET UP:</p>
                      <ol className="space-y-1.5">
                        {automation.steps.map((step, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="font-bold text-primary">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Default Message Template */}
                    {automation.defaultMessage && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">EXAMPLE MESSAGE:</p>
                        <div className="relative">
                          <div className="bg-muted rounded-lg p-3 text-sm font-mono">
                            {automation.defaultMessage}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(automation.defaultMessage, automation.id)}
                            className="absolute top-2 right-2"
                          >
                            {copiedMessage === automation.id ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Available Variables */}
                    {automation.variables.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">AVAILABLE VARIABLES:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {automation.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    {automation.tips && automation.tips.length > 0 && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-primary" />
                          Tips
                        </p>
                        <ul className="space-y-1">
                          {automation.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span>•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ),
    },
    {
      id: "variables",
      title: "Message Variables",
      content: <VariableGuide mode={mode} />,
    },
    {
      id: "integrations",
      title: "Connect External Tools",
      content: <IntegrationGuide />,
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Common issues and how to fix them:
          </p>

          <Accordion type="single" collapsible className="w-full">
            {TROUBLESHOOTING_TIPS.map((tip, i) => (
              <AccordionItem key={i} value={`trouble-${i}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">{tip.problem}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pl-6">
                {tip.solutions.map((solution, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        {solution}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Still having trouble?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contact support and we'll help you get your automations working.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter((s) => matchesSearch(s.title));

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
                {guide.subtitle} — Set up automatic workflows for your business
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="how-it-works" className="w-full">
            {filteredSections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left">{section.title}</AccordionTrigger>
                <AccordionContent>{section.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
