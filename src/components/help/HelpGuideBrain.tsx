import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Upload,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Settings,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HelpGuideBrainProps {
  mode: BusinessMode;
  searchQuery?: string;
}

export function HelpGuideBrain({ mode, searchQuery = "" }: HelpGuideBrainProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getModeKnowledgeExamples = () => {
    switch (mode) {
      case "service":
        return ["Services & pricing", "Booking policies", "Service areas"];
      case "dispatch":
        return ["Service types", "Coverage areas", "Pricing structure"];
      case "food":
        return ["Menu items", "Specials", "Dietary options", "Hours"];
      case "medical":
        return ["Services offered", "Insurance accepted", "New patient info"];
      default:
        return ["Business info", "FAQs", "Policies"];
    }
  };

  const sections = [
    {
      id: "overview",
      title: "What is Business Brain?",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Business Brain is the knowledge center that powers your AI. The more information 
            you add, the better your AI can answer customer questions.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Brain className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">AI Knowledge</h4>
              <p className="text-sm text-muted-foreground">
                Your AI uses this to answer questions accurately
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Lightbulb className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Readiness Score</h4>
              <p className="text-sm text-muted-foreground">
                See how prepared your AI is to handle calls
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "what-to-add",
      title: "What to Add to Your Brain",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Add any information your customers might ask about:
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">Key information for your business:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {getModeKnowledgeExamples().map((example, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{example}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Frequently asked questions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Policies (cancellation, deposits, etc.)</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "faqs",
      title: "Adding FAQs",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            FAQs are the most important part of your AI's knowledge. Add common questions 
            and their answers.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Good FAQ examples
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>Q:</strong> "What are your hours?"</li>
              <li><strong>Q:</strong> "Do you offer financing?"</li>
              <li><strong>Q:</strong> "How much does [service] cost?"</li>
              <li><strong>Q:</strong> "Do you serve [area]?"</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/ai-assistant" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Manage FAQs
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "documents",
      title: "Uploading Documents",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Upload documents like menus, price lists, or policy documents. The AI will 
            extract and learn from them.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <FileText className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Supported Formats</h4>
              <p className="text-sm text-muted-foreground">
                PDF, Word docs, text files, images
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Upload className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Auto-Extract</h4>
              <p className="text-sm text-muted-foreground">
                AI reads and learns from your documents
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/business-brain" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "conflicts",
      title: "Resolving Conflicts",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            If the AI finds conflicting information (like different prices for the same service), 
            it will flag it for you to resolve.
          </p>
          <div className="flex gap-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-medium text-amber-700 dark:text-amber-400">Knowledge Conflict</h4>
              <p className="text-sm text-muted-foreground">
                When conflicts are detected, you'll see a banner on your dashboard prompting 
                you to review and choose the correct information.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "readiness",
      title: "Understanding Readiness Score",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The readiness score shows how prepared your AI is to handle customer calls.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3">What affects your score:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Business hours</strong> - Set when you're available</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Services/Menu</strong> - What you offer and pricing</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>FAQs</strong> - Common questions answered</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Policies</strong> - Booking/cancellation rules</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Aim for 80%+ readiness before going live with your AI.
          </p>
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
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Business Brain</CardTitle>
              <CardDescription>
                Train your AI with your business knowledge
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
