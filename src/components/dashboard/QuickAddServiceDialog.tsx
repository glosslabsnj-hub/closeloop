import { useNavigate } from "react-router-dom";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Briefcase, UtensilsCrossed } from "lucide-react";

interface QuickAddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * QuickAddServiceDialog - Redirects to Business Brain
 *
 * This dialog no longer performs writes. All service/menu management
 * has been moved to the Business Brain page for centralized control.
 */
export function QuickAddServiceDialog({ open, onOpenChange }: QuickAddServiceDialogProps) {
  const navigate = useNavigate();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();

  const isFood = caps.isFoodBusiness;
  const entityName = isFood ? 'Menu Item' : 'Service';
  const Icon = isFood ? UtensilsCrossed : Briefcase;

  const handleGoToBrain = () => {
    onOpenChange(false);
    navigate("/app/business-brain");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Add {entityName} in Business Brain
          </DialogTitle>
          <DialogDescription>
            {entityName} management has moved to a centralized location
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Icon className="h-8 w-8 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">
                All {isFood ? "menu items" : "services"} are now managed in Business Brain
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                This ensures consistency across your AI and gives you a single place
                to manage all your business knowledge.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Add and edit {isFood ? "menu items" : "services"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Configure pricing rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Set descriptions and details</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGoToBrain}>
            <Brain className="h-4 w-4 mr-2" />
            Go to Business Brain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
