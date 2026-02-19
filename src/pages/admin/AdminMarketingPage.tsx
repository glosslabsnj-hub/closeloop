import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, LayoutTemplate, Library } from "lucide-react";
import { MarketingChatPanel } from "@/components/admin/marketing/MarketingChatPanel";
import { StrategyTemplates } from "@/components/admin/marketing/StrategyTemplates";
import { SavedContentLibrary } from "@/components/admin/marketing/SavedContentLibrary";

export default function AdminMarketingPage() {
  const [tab, setTab] = useState("chat");
  const [chatKey, setChatKey] = useState(0);

  const handleSelectTemplate = (prompt: string, category: string) => {
    // Switch to chat tab and trigger a new message
    setTab("chat");
    // Use a small delay to let the tab switch happen first
    setTimeout(() => {
      // We'll use a custom event to pass the template to the chat panel
      window.dispatchEvent(new CustomEvent("marketing-template", { detail: { prompt, category } }));
    }, 100);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Marketing HQ</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered marketing strategies, content generation, and campaign planning for CloseLoop.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-10">
          <TabsTrigger value="chat" className="text-sm px-4 gap-2">
            <MessageSquare className="h-4 w-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-sm px-4 gap-2">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="library" className="text-sm px-4 gap-2">
            <Library className="h-4 w-4" /> Content Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <MarketingChatPanel key={chatKey} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <StrategyTemplates onSelectTemplate={handleSelectTemplate} />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <SavedContentLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
