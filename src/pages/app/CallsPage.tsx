import { CallsListView } from "@/components/calls/CallsListView";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Loader2 } from "lucide-react";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";

export default function CallsPage() {
  // P0-3: Route protection - redirect if ai_voice module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["ai_voice"]);

  if (moduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <ModuleUnavailablePage
        title="Calls Not Available"
        description="The Calls page requires Voice AI to be enabled for your account."
        moduleName="Voice AI"
      />
    );
  }

  return <CallsListView />;
}
