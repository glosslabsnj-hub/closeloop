import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import DispatchWorkflowConfig from "./workflow/DispatchWorkflowConfig";
import ServiceWorkflowConfig from "./workflow/ServiceWorkflowConfig";
import FoodWorkflowConfig from "./workflow/FoodWorkflowConfig";
import MedicalWorkflowConfig from "./workflow/MedicalWorkflowConfig";
import GeneralWorkflowConfig from "./workflow/GeneralWorkflowConfig";

export default function WorkflowConfigEditor() {
  const { businessMode } = useTenantConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workflow Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Customize how your AI agent handles calls for your specific business needs
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Zero Hard-Coded Logic:</strong> These settings determine exactly how your AI agent
          behaves during calls. Every business is unique - configure workflows that match YOUR
          processes, not a one-size-fits-all template.
        </AlertDescription>
      </Alert>

      {/* Mode-Specific Config */}
      {businessMode === "dispatch" && <DispatchWorkflowConfig />}
      {businessMode === "service" && <ServiceWorkflowConfig />}
      {businessMode === "food" && <FoodWorkflowConfig />}
      {businessMode === "medical" && <MedicalWorkflowConfig />}
      {businessMode === "general" && <GeneralWorkflowConfig />}

      {/* Fallback for unknown modes */}
      {!["dispatch", "service", "food", "medical", "general"].includes(businessMode || "") && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <strong>No workflow configuration available</strong> for business mode: {businessMode}
            <br />
            Please set your business mode in Settings to configure AI workflow behavior.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Section (Future Enhancement) */}
      {/* <Card className="mt-8">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your workflow configuration affects the agent's behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon: Interactive preview of your configured workflow
          </p>
        </CardContent>
      </Card> */}
    </div>
  );
}
