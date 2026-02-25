import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Brain, 
  FileJson, 
  Calendar, 
  ExternalLink,
  Bug,
} from "lucide-react";

const DEBUG_PAGES = [
  {
    path: "/debug/context",
    label: "Context Debugger",
    description: "AI context, ElevenLabs variables, preview blocks, warnings",
    icon: Brain,
    color: "text-primary bg-primary/10",
  },
  {
    path: "/debug/telephony",
    label: "Telephony Debug",
    description: "Twilio logs, phone config, webhook URLs",
    icon: Phone,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    path: "/debug/ai-context",
    label: "AI Context Inspector",
    description: "Context snapshots, missing sections, dynamic variables",
    icon: Brain,
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    path: "/debug/extraction",
    label: "Extraction Debug",
    description: "Extracted payload, event logs, derived entities",
    icon: FileJson,
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    path: "/debug/availability",
    label: "Availability Debug",
    description: "Busy blocks, available slots, booking flow test",
    icon: Calendar,
    color: "text-emerald-500 bg-emerald-500/10",
  },
];

interface DebugPagesNavProps {
  compact?: boolean;
}

export function DebugPagesNav({ compact = false }: DebugPagesNavProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {DEBUG_PAGES.map((page) => {
          const Icon = page.icon;
          return (
            <Button
              key={page.path}
              variant="outline"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link to={page.path}>
                <Icon className="h-4 w-4" />
                {page.label.replace(" Debug", "")}
              </Link>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug Pages
        </CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        {DEBUG_PAGES.map((page) => {
          const Icon = page.icon;
          return (
            <Link
              key={page.path}
              to={page.path}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg shrink-0 ${page.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {page.label}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {page.description}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
