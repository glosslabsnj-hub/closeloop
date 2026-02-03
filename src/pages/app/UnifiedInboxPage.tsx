import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, PhoneCall, Users } from "lucide-react";
import InboxPage from "./InboxPage";
import CallsPage from "./CallsPage";
import LeadsPage from "./LeadsPage";

type TabValue = "inbox" | "calls" | "leads";

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

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
        <div className="border-b bg-background px-4 md:px-6 pt-4">
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
        </div>

        <TabsContent value="inbox" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <InboxPage />
        </TabsContent>

        <TabsContent value="calls" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <CallsPage />
        </TabsContent>

        <TabsContent value="leads" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <LeadsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
