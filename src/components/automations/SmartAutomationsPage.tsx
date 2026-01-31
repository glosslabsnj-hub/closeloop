import { useState } from "react";
import { 
  Zap, ChevronDown, ChevronUp, Headset, Sparkles, History, Settings2 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { OneClickPresets } from "./OneClickPresets";
import { AutomationRulesSection } from "./AutomationRulesSection";
import { AutomationRunHistorySection } from "./AutomationRunHistorySection";
import { ConciergeRequestDialog } from "@/components/integrations/ConciergeRequestDialog";

export default function SmartAutomationsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);

  if (!tenantId) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Smart Automations
          </h1>
          <p className="page-subtitle">
            One-click setup for what happens when calls, orders, and bookings come in
          </p>
        </div>
        
        {/* Concierge CTA */}
        <Button 
          variant="outline" 
          className="gap-2 shrink-0"
          onClick={() => setConciergeOpen(true)}
        >
          <Headset className="h-4 w-4" />
          Have an expert set this up
        </Button>
      </div>

      {/* One-Click Presets Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Quick Setup (80/20)</h2>
          <Badge variant="secondary" className="text-xs">Most popular</Badge>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Turn these on with one click — covers 80% of use cases
        </p>
        
        <OneClickPresets tenantId={tenantId} />
      </section>

      {/* Run History Section - Collapsible */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto border rounded-lg bg-muted/30 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="font-medium">Run History</span>
              <Badge variant="outline" className="text-xs">View logs & retry</Badge>
            </div>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <AutomationRunHistorySection tenantId={tenantId} />
        </CollapsibleContent>
      </Collapsible>

      {/* Advanced Section - Collapsible */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto border rounded-lg bg-muted/30 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="font-medium">Advanced</span>
              <Badge variant="outline" className="text-xs">Custom rules</Badge>
            </div>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custom Automation Rules</CardTitle>
              <CardDescription>
                Create custom event-to-action mappings for advanced use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomationRulesSection tenantId={tenantId} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Concierge Dialog */}
      <ConciergeRequestDialog open={conciergeOpen} onOpenChange={setConciergeOpen} />
    </div>
  );
}
