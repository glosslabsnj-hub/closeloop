import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ShieldAlert, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const examplePromises = [
  "Never promise same-day service without checking availability",
  "Never guarantee exact arrival times (only windows)",
  "Never commit to prices without knowing job details",
  "Never promise we can service areas outside our coverage",
];

export function AINeverPromiseEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [promises, setPromises] = useState<string[]>([]);
  const [newPromise, setNewPromise] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      const aiNeverPromise = tenant.ai_never_promise;
      if (Array.isArray(aiNeverPromise)) {
        setPromises(aiNeverPromise);
      }
      setIsLoading(false);
    }
  }, [tenant]);

  const handleAddPromise = () => {
    const trimmed = newPromise.trim();
    if (trimmed && !promises.includes(trimmed)) {
      setPromises([...promises, trimmed]);
      setNewPromise("");
    }
  };

  const handleRemovePromise = (index: number) => {
    setPromises(promises.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ ai_never_promise: promises } as any)
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success("AI restrictions updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Things the AI Should Never Promise
        </CardTitle>
        <CardDescription>
          Define guardrails to prevent your AI from making commitments you can't keep.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Promises List */}
        {promises.length > 0 ? (
          <div className="space-y-2">
            {promises.map((promise, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card"
              >
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm flex-1">{promise}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePromise(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No restrictions configured yet</p>
            <p className="text-xs">Add rules below to protect your business</p>
          </div>
        )}

        {/* Add New Promise */}
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Never promise same-day service without checking"
            value={newPromise}
            onChange={(e) => setNewPromise(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPromise()}
          />
          <Button variant="outline" onClick={handleAddPromise} disabled={!newPromise.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Example Suggestions */}
        {promises.length < 3 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Common examples (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {examplePromises
                .filter((ex) => !promises.includes(ex))
                .slice(0, 3)
                .map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setPromises([...promises, example])}
                  >
                    + {example.substring(0, 40)}...
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Restrictions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
