import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink, Zap, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ZAPIER_SETUP_STEPS, INTEGRATION_EXAMPLES } from "@/data/workflowGuides";

interface IntegrationGuideProps {
  showZapierSetup?: boolean;
  showExamples?: boolean;
  samplePayload?: Record<string, unknown>;
}

export function IntegrationGuide({
  showZapierSetup = true,
  showExamples = true,
  samplePayload,
}: IntegrationGuideProps) {
  const { toast } = useToast();
  const [copiedPayload, setCopiedPayload] = useState(false);

  const defaultPayload = samplePayload || {
    event: "call.ended",
    timestamp: new Date().toISOString(),
    customer_name: "Sarah Johnson",
    customer_phone: "+15551234567",
    summary: "Customer inquired about availability for next Tuesday",
    outcome: "booked",
    service_requested: "Haircut & Style",
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(defaultPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      {/* Zapier Setup Guide */}
      {showZapierSetup && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Connect with Zapier</CardTitle>
                <CardDescription>
                  Use Zapier to connect with 5,000+ apps including Slack, Google Sheets, HubSpot, and more
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible defaultValue="steps">
              <AccordionItem value="steps">
                <AccordionTrigger className="text-sm font-medium">
                  Step-by-Step Setup
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {ZAPIER_SETUP_STEPS.map((step) => (
                        <div key={step.step} className="flex gap-4">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <span className="text-xs font-bold">{step.step}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="payload">
                <AccordionTrigger className="text-sm font-medium">
                  Sample Data Payload
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-muted-foreground">
                      This is an example of the data that will be sent to your webhook. Use this to set up your Zap's fields.
                    </p>
                    <div className="relative">
                      <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(defaultPayload, null, 2)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPayload}
                        className="absolute top-2 right-2"
                      >
                        {copiedPayload ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open("https://zapier.com/apps/webhook", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Zapier
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Integration Examples */}
      {showExamples && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Integrations</CardTitle>
            <CardDescription>
              Common ways businesses connect their data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {INTEGRATION_EXAMPLES.map((example) => (
                <div
                  key={example.name}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {example.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{example.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{example.description}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <span>Zapier action:</span>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="secondary" className="text-xs">
                        {example.zapierAction}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Direct Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Webhook</CardTitle>
          <CardDescription>
            For developers: Send data directly to your own endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you have your own server or custom integration, you can receive webhook data directly:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Data is sent as a <code className="bg-muted px-1 rounded">POST</code> request with JSON body</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Your endpoint should respond with status <code className="bg-muted px-1 rounded">200</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Requests timeout after 30 seconds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Failed requests will be retried up to 3 times</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
