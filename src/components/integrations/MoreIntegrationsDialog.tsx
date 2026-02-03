import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  POPULAR_INTEGRATIONS, 
  INTEGRATION_CATEGORIES,
  type IntegrationCategory 
} from "@/data/popularIntegrations";

interface MoreIntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSetup: (systemName: string) => void;
}

export function MoreIntegrationsDialog({
  open,
  onOpenChange,
  onRequestSetup,
}: MoreIntegrationsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter integrations by search
  const filteredIntegrations = POPULAR_INTEGRATIONS.filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const groupedIntegrations = INTEGRATION_CATEGORIES.map((category) => ({
    ...category,
    integrations: filteredIntegrations.filter((i) => i.category === category.id),
  })).filter((group) => group.integrations.length > 0);

  const handleRequestSetup = (integrationName: string) => {
    onRequestSetup(integrationName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>All Integrations</DialogTitle>
          <DialogDescription>
            Browse available integrations. Our team will set these up for you.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Integration List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {groupedIntegrations.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-1">
                  <span className="text-lg">{group.icon}</span>
                  <h3 className="font-medium text-sm">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({group.integrations.length})
                  </span>
                </div>

                <div className="grid gap-2">
                  {group.integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{integration.icon}</span>
                        <div>
                          <h4 className="font-medium text-sm">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestSetup(integration.name)}
                        className="shrink-0"
                      >
                        Request Setup
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {groupedIntegrations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No integrations found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Don't see your tool?
            </div>
            <Button
              variant="link"
              className="gap-1 p-0 h-auto"
              onClick={() => handleRequestSetup("Custom Integration")}
            >
              Request a custom integration
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
