import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, UtensilsCrossed, Loader2 } from "lucide-react";

interface QuickAddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddServiceDialog({ open, onOpenChange }: QuickAddServiceDialogProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const isFood = businessMode === 'food';
  const entityName = isFood ? 'Menu Item' : 'Service';

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name.trim()) return;

    setIsSubmitting(true);

    try {
      if (isFood) {
        // Add to menu_items table
        const { error } = await supabase.from("menu_items").insert([{
          tenant_id: tenant.id,
          name: name.trim(),
          description: description.trim() || null,
          price_cents: price ? Math.round(parseFloat(price) * 100) : null,
        }]);

        if (error) throw error;
      } else {
        // Add to services table
        const { error } = await supabase.from("services").insert([{
          tenant_id: tenant.id,
          name: name.trim(),
          description: description.trim() || null,
          price_type: price ? "fixed" as const : "quote_only" as const,
          price_amount: price ? parseFloat(price) : null,
          duration_minutes: parseInt(duration) || 60,
          is_active: true,
        }]);

        if (error) throw error;
      }

      toast({
        title: `${entityName} added!`,
        description: `Your AI now knows about "${name}".`,
      });

      // Reset and close
      setName("");
      setDescription("");
      setPrice("");
      setDuration("60");
      onOpenChange(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `Failed to add ${entityName.toLowerCase()}`,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFood ? (
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            ) : (
              <Briefcase className="h-5 w-5 text-primary" />
            )}
            Add {entityName}
          </DialogTitle>
          <DialogDescription>
            {isFood
              ? "Add a menu item with name, description, and price."
              : "Add a service you offer with pricing and duration."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={isFood ? 'e.g., "Margherita Pizza"' : 'e.g., "Haircut"'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder={isFood ? "Ingredients, notes..." : "What's included in this service..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {!isFood && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  placeholder="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {entityName}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
