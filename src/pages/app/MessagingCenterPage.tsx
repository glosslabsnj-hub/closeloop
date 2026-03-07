import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversationsTab } from "@/components/messaging/ConversationsTab";
import { AutomationsTab } from "@/components/messaging/AutomationsTab";
import { CampaignsTab } from "@/components/messaging/CampaignsTab";
import { TemplatesTab } from "@/components/messaging/TemplatesTab";
import { cn } from "@/lib/utils";
import { MessageSquare, Zap, Megaphone, FileText } from "lucide-react";

const TABS = [
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "templates", label: "Templates", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MessagingCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "conversations";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Messaging Center"
        description="Manage conversations, automated messages, campaigns, and templates"
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/30 mb-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "conversations" && <ConversationsTab />}
      {activeTab === "automations" && <AutomationsTab />}
      {activeTab === "campaigns" && <CampaignsTab />}
      {activeTab === "templates" && <TemplatesTab />}
    </PageContainer>
  );
}
