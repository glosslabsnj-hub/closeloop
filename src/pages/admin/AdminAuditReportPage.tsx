import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

interface AuditItem {
  id: string;
  category: string;
  description: string;
  status: "fixed" | "pending" | "info";
  details?: string;
  link?: string;
}

const AUDIT_ITEMS: AuditItem[] = [
  // ROUTES + NAVIGATION
  {
    id: "nav-automations",
    category: "Routes & Navigation",
    description: "Added 'Automations' to sidebar navigation",
    status: "fixed",
    details: "Replaced 'Integrations' with 'Automations' in AppLayout.tsx. Workflows and Automations are now unified under a single tab.",
  },
  {
    id: "nav-integrations-redirect",
    category: "Routes & Navigation",
    description: "/app/integrations remains accessible",
    status: "fixed",
    details: "IntegrationsPage is still routed but Automations is the primary nav entry.",
  },
  {
    id: "nav-workflows-merged",
    category: "Routes & Navigation",
    description: "/app/workflows redirects to /app/automations",
    status: "fixed",
    details: "App.tsx already had this redirect. Both pages now show AutomationsPage.",
    link: "/app/automations",
  },
  {
    id: "route-module-gating",
    category: "Routes & Navigation",
    description: "Module gating enforced via useRouteGuard",
    status: "fixed",
    details: "Routes like /app/calls, /app/bookings, /app/dispatch are gated by enabled_modules.",
    link: "/app/settings",
  },
  
  // DATA WIRES
  {
    id: "calls-realtime",
    category: "Data Wires",
    description: "Calls page uses realtime subscription",
    status: "fixed",
    details: "CallsPage.tsx subscribes to ai_call_sessions changes for instant webhook updates.",
    link: "/app/calls",
  },
  {
    id: "calls-customer-join",
    category: "Data Wires",
    description: "Calls page joins customer data",
    status: "fixed",
    details: "Query includes customer relation for linked records.",
  },
  {
    id: "webhook-post-call",
    category: "Data Wires",
    description: "ElevenLabs webhook processes post_call_transcription",
    status: "fixed",
    details: "Updated elevenlabs-webhook to accept 'post_call_transcription' event type and parse nested data structure.",
  },
  {
    id: "customer-dedupe",
    category: "Data Wires",
    description: "Customer resolution by phone_e164",
    status: "fixed",
    details: "elevenlabs-webhook uses normalizeToE164() and upserts customers by phone.",
  },
  
  // TELEPHONY
  {
    id: "hmac-verification",
    category: "Telephony",
    description: "ElevenLabs HMAC signature verification",
    status: "fixed",
    details: "Uses ELEVENLABS_CONVAI_WEBHOOK_SECRET with correct signed payload format (timestamp.rawBody).",
  },
  {
    id: "twilio-twiml",
    category: "Telephony",
    description: "twilio-inbound always returns TwiML",
    status: "fixed",
    details: "Even on errors, function returns valid TwiML XML to prevent Twilio failures.",
  },
  
  // AUTOMATIONS
  {
    id: "automations-unified",
    category: "Automations",
    description: "Single Automations page with tabs",
    status: "fixed",
    details: "AutomationsPage has Automations, Connect Tools, Templates, and Run History tabs.",
    link: "/app/automations",
  },
  {
    id: "automation-rules-db",
    category: "Automations",
    description: "Toggles write to automation_rules table",
    status: "fixed",
    details: "AutomationRulesSection creates/toggles rules in automation_rules.",
  },
  
  // BUSINESS BRAIN
  {
    id: "brain-readiness",
    category: "Business Brain",
    description: "AI Readiness Score displayed",
    status: "fixed",
    details: "AIReadinessScore component shows completion percentage based on business context.",
    link: "/app/business-brain",
  },
  {
    id: "brain-conflicts",
    category: "Business Brain",
    description: "Knowledge conflict banner on dashboard",
    status: "fixed",
    details: "KnowledgeConflictBanner appears when unresolvedCount > 0.",
  },
  
  // DOCUMENTATION
  {
    id: "docs-stability",
    category: "Documentation",
    description: "Created STABILITY_CHECKLIST.md",
    status: "fixed",
    details: "Guidelines for adding pages, SKUs, modules, connectors, and edge functions.",
  },
  {
    id: "docs-datamap",
    category: "Documentation",
    description: "Created DATA_MAP.md",
    status: "fixed",
    details: "Maps UI pages to database tables and edge functions to events.",
  },
  
  // PENDING
  {
    id: "calendar-sync-oauth",
    category: "Integrations",
    description: "Google Calendar OAuth flow",
    status: "pending",
    details: "OAuth callback exists but needs end-to-end testing with real credentials.",
  },
  {
    id: "stripe-live",
    category: "Billing",
    description: "Stripe live mode pricing",
    status: "pending",
    details: "LADDER_STEPS have null stripePriceId - needs production Stripe setup.",
  },
];

export default function AdminAuditReportPage() {
  const fixedItems = AUDIT_ITEMS.filter(i => i.status === "fixed");
  const pendingItems = AUDIT_ITEMS.filter(i => i.status === "pending");
  const _infoItems = AUDIT_ITEMS.filter(i => i.status === "info");

  const categories = Array.from(new Set(AUDIT_ITEMS.map(i => i.category)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Stability Audit Report
          </h1>
          <p className="text-muted-foreground">
            Stability + organization audit results
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: February 2026
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/golden-path">
              Run Tests
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <CheckCircle2 className="h-8 w-8" />
              <span className="text-3xl font-bold">{fixedItems.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Issues Fixed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-accent-foreground mb-2">
              <AlertTriangle className="h-8 w-8" />
              <span className="text-3xl font-bold">{pendingItems.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-secondary-foreground mb-2">
              <FileText className="h-8 w-8" />
              <span className="text-3xl font-bold">{categories.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Categories Audited</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
          <CardDescription>
            All items checked during the stability audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {categories.map(category => {
              const items = AUDIT_ITEMS.filter(i => i.category === category);
              
              return (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="mt-0.5">
                          {item.status === "fixed" && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                          {item.status === "pending" && (
                            <AlertTriangle className="h-5 w-5 text-accent-foreground" />
                          )}
                          {item.status === "info" && (
                            <FileText className="h-5 w-5 text-secondary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{item.description}</p>
                            <Badge 
                              variant={item.status === "fixed" ? "default" : item.status === "pending" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          {item.details && (
                            <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                          )}
                        </div>
                        {item.link && (
                          <Button variant="ghost" size="sm" asChild className="shrink-0">
                            <Link to={item.link}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-6" />
                </div>
              );
            })}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Steps</CardTitle>
          <CardDescription>
            How to verify these fixes are working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Golden Path Test</h4>
            <p className="text-sm text-muted-foreground">
              Go to <Link to="/admin/golden-path" className="text-primary underline">Golden Path QA</Link> and verify all scenarios pass.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Make a Test Call</h4>
            <p className="text-sm text-muted-foreground">
              Use the simulator or real phone to call the Twilio number. Verify the call appears in the Calls tab with summary/transcript after ~1 minute.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Check Automations</h4>
            <p className="text-sm text-muted-foreground">
              Go to <Link to="/app/automations" className="text-primary underline">Automations</Link> and toggle an automation on. Verify the rule is created and shows in Run History when triggered.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">4. Review Documentation</h4>
            <p className="text-sm text-muted-foreground">
              Check <code>docs/audits/STABILITY_CHECKLIST.md</code> and <code>docs/audits/DATA_MAP.md</code> for development guidelines.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
