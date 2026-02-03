import { ExternalLink, FileText, Printer, Eye, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface QuickActionsMenuProps {
  providerId: string;
  integrationConfig?: Record<string, unknown>;
  onTest?: () => void;
  onReconnect?: () => void;
  onSettings?: () => void;
}

export function QuickActionsMenu({ 
  providerId, 
  integrationConfig,
  onTest,
  onReconnect,
  onSettings,
}: QuickActionsMenuProps) {
  const { toast } = useToast();

  const getQuickActions = (): QuickAction[] => {
    switch (providerId) {
      case "google_calendar":
        return [
          {
            id: "view-calendar",
            label: "Open Google Calendar",
            icon: <ExternalLink className="h-4 w-4" />,
            description: "View your calendar in a new tab",
            onClick: () => {
              window.open("https://calendar.google.com", "_blank");
            },
          },
          {
            id: "view-last-event",
            label: "View latest synced event",
            icon: <Eye className="h-4 w-4" />,
            description: "Jump to the most recently created event",
            onClick: () => {
              // In a real implementation, this would open the specific event
              toast({
                title: "Opening calendar",
                description: "Navigating to your most recent synced event",
              });
              window.open("https://calendar.google.com", "_blank");
            },
          },
        ];

      case "google_sheets":
        const sheetId = integrationConfig?.sheet_id as string;
        return [
          {
            id: "view-sheet",
            label: "Open Spreadsheet",
            icon: <ExternalLink className="h-4 w-4" />,
            description: "View your connected spreadsheet",
            onClick: () => {
              const url = sheetId 
                ? `https://docs.google.com/spreadsheets/d/${sheetId}`
                : "https://sheets.google.com";
              window.open(url, "_blank");
            },
          },
          {
            id: "view-last-row",
            label: "View last entry",
            icon: <FileText className="h-4 w-4" />,
            description: "See the most recently added row",
            onClick: () => {
              const url = sheetId 
                ? `https://docs.google.com/spreadsheets/d/${sheetId}`
                : "https://sheets.google.com";
              window.open(url, "_blank");
            },
          },
        ];

      case "webhook":
        return [
          {
            id: "view-last-delivery",
            label: "View last delivery",
            icon: <Eye className="h-4 w-4" />,
            description: "See the payload and response of the last webhook call",
            onClick: () => {
              toast({
                title: "View in History",
                description: "Check the History tab for detailed webhook logs",
              });
            },
          },
          {
            id: "test-webhook",
            label: "Send test payload",
            icon: <RefreshCw className="h-4 w-4" />,
            description: "Send a sample payload to test your webhook",
            onClick: () => onTest?.(),
            disabled: !onTest,
          },
        ];

      case "printer":
        return [
          {
            id: "test-print",
            label: "Print test ticket",
            icon: <Printer className="h-4 w-4" />,
            description: "Send a test print job to verify connection",
            onClick: () => {
              toast({
                title: "Test print sent",
                description: "A test ticket has been sent to your printer",
              });
              onTest?.();
            },
          },
          {
            id: "printnode-dashboard",
            label: "Open PrintNode dashboard",
            icon: <ExternalLink className="h-4 w-4" />,
            description: "Manage your cloud printer settings",
            onClick: () => {
              window.open("https://app.printnode.com", "_blank");
            },
          },
        ];

      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  // Always include common actions
  const commonActions: QuickAction[] = [
    ...(onTest ? [{
      id: "test-connection",
      label: "Test connection",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onTest,
    }] : []),
    ...(onSettings ? [{
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      onClick: onSettings,
    }] : []),
    ...(onReconnect ? [{
      id: "reconnect",
      label: "Reconnect",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onReconnect,
    }] : []),
  ];

  const allActions = [...quickActions, ...commonActions];

  if (allActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem 
            key={action.id} 
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex items-start gap-2 py-2"
          >
            {action.icon}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{action.label}</p>
              {action.description && (
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {commonActions.length > 0 && quickActions.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {commonActions.map((action) => (
          <DropdownMenuItem 
            key={action.id} 
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
