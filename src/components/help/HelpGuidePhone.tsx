import { useState } from "react";
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
  Phone,
  PhoneForwarded,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Smartphone,
  Zap,
  Clock,
  HelpCircle,
  PlayCircle,
  Bot,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface HelpGuidePhoneProps {
  searchQuery?: string;
}

export function HelpGuidePhone({ searchQuery = "" }: HelpGuidePhoneProps) {
  const { toast } = useToast();
  const { assistantSettings } = useAuth();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const closeloopNumber = assistantSettings?.closeloop_number || "+1 (555) 123-4567";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  // Simple search filter
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "How Phone Connection Works",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Voxly gives you a dedicated AI phone number. When customers call this number, 
            your AI answers professionally, handles inquiries, and can book appointments or take messages.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <PhoneForwarded className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Forward Your Calls</h4>
              <p className="text-sm text-muted-foreground">
                Keep your existing number and forward unanswered calls to your AI
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Phone className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Dedicated AI Line</h4>
              <p className="text-sm text-muted-foreground">
                Use your Voxly number as a dedicated booking line
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "your-number",
      title: "Your Voxly Number",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Phone className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Your AI answers at:</p>
              <code className="font-mono text-lg font-bold text-primary">{closeloopNumber}</code>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(closeloopNumber.replace(/\D/g, ""), "Number")}
              className="ml-auto"
            >
              {copiedItem === "Number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This is the number your AI assistant uses. You can forward calls here from your 
            existing business line, or give this number directly to customers.
          </p>
        </div>
      ),
    },
    {
      id: "forwarding-setup",
      title: "Setting Up Call Forwarding",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Configure your phone to forward calls when you're busy or don't answer:
          </p>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="verizon">
              <AccordionTrigger>Verizon</AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">1</Badge>
                    Open your Phone app and go to Keypad
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">2</Badge>
                    Dial <code className="bg-muted px-1 rounded">*71{closeloopNumber.replace(/\D/g, "")}</code>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">3</Badge>
                    Press Call and wait for confirmation beeps
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">4</Badge>
                    To disable: Dial <code className="bg-muted px-1 rounded">*73</code>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="att">
              <AccordionTrigger>AT&T</AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">1</Badge>
                    Open your Phone app and go to Keypad
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">2</Badge>
                    Dial <code className="bg-muted px-1 rounded">*61*{closeloopNumber.replace(/\D/g, "")}#</code>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">3</Badge>
                    Press Call and wait for confirmation
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">4</Badge>
                    To disable: Dial <code className="bg-muted px-1 rounded">#61#</code>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tmobile">
              <AccordionTrigger>T-Mobile</AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">1</Badge>
                    Dial <code className="bg-muted px-1 rounded">**61*{closeloopNumber.replace(/\D/g, "")}#</code>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">2</Badge>
                    Press Call and wait for confirmation
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">3</Badge>
                    To disable: Dial <code className="bg-muted px-1 rounded">##61#</code>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="iphone">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  iPhone Settings
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">1</Badge>
                    Open <strong>Settings</strong> → <strong>Phone</strong>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">2</Badge>
                    Tap <strong>Call Forwarding</strong>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">3</Badge>
                    Toggle it <strong>ON</strong>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">4</Badge>
                    Enter: <code className="bg-muted px-1 rounded">{closeloopNumber}</code>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
    {
      id: "text-back",
      title: "Automatic Text-Back",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When someone calls and you can't answer, Voxly can automatically send them a 
            personalized text message within seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 rounded-lg bg-muted/30">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                <Phone className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-xs">Missed Call</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs">30s Delay</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs">AI Text Sent</span>
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-2">To enable:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Go to <strong>Settings</strong></li>
              <li>2. Enable <strong>Instant Text-Back</strong></li>
              <li>3. Set your preferred delay (0-120 seconds)</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "test-ai",
      title: "Testing Your AI",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Before going live, test your AI to make sure it sounds and responds correctly.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <PlayCircle className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Browser Test</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Talk to your AI directly in the browser using the Simulator
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/app/simulator">Open Simulator</a>
              </Button>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Phone className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Real Call Test</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Have your AI call your phone to test the full experience
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/app/simulator">Test Call</a>
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "go-live",
      title: "Going Live",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Once you're satisfied with your AI's responses, you're ready to go live!
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Go-Live Checklist
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Phone number connected and verified</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Business hours configured correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>AI tested in simulator or via phone call</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Business Brain has your key information</span>
              </li>
            </ul>
          </div>
          <Button asChild>
            <a href="/app/dashboard" className="gap-2">
              Go to Dashboard
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
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Phone Setup</CardTitle>
              <CardDescription>
                Connect your phone and enable AI call handling
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
