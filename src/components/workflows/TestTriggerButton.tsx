import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTestTriggerWorkflow } from "@/hooks/useWorkflowRuns";

interface TestTriggerButtonProps {
  tenantId: string;
  workflowId: string;
  trigger: string;
  disabled?: boolean;
}

export function TestTriggerButton({ tenantId, workflowId, trigger, disabled }: TestTriggerButtonProps) {
  const [open, setOpen] = useState(false);
  const testTrigger = useTestTriggerWorkflow();

  const handleTest = (dryRun: boolean) => {
    setOpen(false);
    testTrigger.mutate({
      tenantId,
      workflowId,
      trigger,
      dryRun,
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || testTrigger.isPending}
        >
          {testTrigger.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Test
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Test Workflow</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleTest(true)}>
          <span className="font-medium">Dry Run</span>
          <span className="text-xs text-muted-foreground ml-2">
            (simulate without side effects)
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTest(false)}>
          <span className="font-medium">Execute</span>
          <span className="text-xs text-muted-foreground ml-2">
            (run with sample data)
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
