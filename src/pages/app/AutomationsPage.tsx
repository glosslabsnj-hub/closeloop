import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ConnectToolsSection } from "@/components/automations/ConnectToolsSection";
import { AutomationRulesSection } from "@/components/automations/AutomationRulesSection";
import { AutomationTemplatesSection } from "@/components/automations/AutomationTemplatesSection";
import { AutomationRunHistorySection } from "@/components/automations/AutomationRunHistorySection";
import { Zap, Link2, Sparkles, History } from "lucide-react";

export default function AutomationsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const [activeTab, setActiveTab] = useState("automations");

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
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Automations
        </h1>
        <p className="page-subtitle">
          Connect your tools and automate what happens when calls, orders, and bookings come in
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automations</span>
          </TabsTrigger>
          <TabsTrigger value="connect" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Tools</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Run History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-6">
          <AutomationRulesSection tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="connect" className="space-y-6">
          <ConnectToolsSection tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <AutomationTemplatesSection tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AutomationRunHistorySection tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
