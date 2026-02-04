import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MessageSquare, PhoneCall, Users, Inbox } from "lucide-react";
import InboxPage from "./InboxPage";
import CallsPage from "./CallsPage";
import LeadsPage from "./LeadsPage";

type TabValue = "inbox" | "calls" | "leads";

const TAB_META: Record<TabValue, { title: string; description: string }> = {
  inbox: { title: "Inbox", description: "Messages and conversations with customers" },
  calls: { title: "Calls", description: "AI-handled calls with extracted information" },
  leads: { title: "Leads", description: "Captured leads from calls and messages" },
};

/**
 * UnifiedInboxPage - Combines Inbox, Calls, and Leads into one tabbed view.
 * Uses query param ?tab=inbox|calls|leads for navigation.
 */
export default function UnifiedInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Validate and default tab
  const isValidTab = (t: string | null): t is TabValue =>
    t === "inbox" || t === "calls" || t === "leads";

  const [activeTab, setActiveTab] = useState<TabValue>(
    isValidTab(tabParam) ? tabParam : "inbox"
  );

  // Sync URL with tab state
  useEffect(() => {
    if (tabParam !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, tabParam, setSearchParams]);

  // Update tab when URL changes (e.g., from redirect)
  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
    }
  };

  const currentMeta = TAB_META[activeTab];

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<Inbox className="h-5 w-5" />}
        title={currentMeta.title}
        description={currentMeta.description}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="inbox" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Inbox</span>
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex-1 gap-2">
            <PhoneCall className="h-4 w-4" />
            <span>Calls</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            <span>Leads</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-0">
          <InboxPage />
        </TabsContent>

        <TabsContent value="calls" className="mt-0">
          <CallsPage />
        </TabsContent>

        <TabsContent value="leads" className="mt-0">
          <LeadsPage />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
