import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, MessageSquare, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AssistantSettings {
  greeting_script: string | null;
  fallback_script: string | null;
}

const defaultGreeting = "Hi, thanks for calling! How can I help you today?";
const defaultFallback = "I'm sorry, I didn't quite catch that. Could you please repeat that for me?";

export function AIScriptsEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [scripts, setScripts] = useState({
    greeting: "",
    fallback: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      if (!tenant?.id) return;

      try {
        const { data, error } = await supabase
          .from("ai_assistants")
          .select("greeting_script, fallback_script")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (error) throw error;

        setScripts({
          greeting: data?.greeting_script || "",
          fallback: data?.fallback_script || "",
        });
      } catch (error) {
        console.error("Failed to load AI scripts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [tenant?.id]);

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      // Try to update existing record
      const { data: existing } = await supabase
        .from("ai_assistants")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("ai_assistants")
          .update({
            greeting_script: scripts.greeting || null,
            fallback_script: scripts.fallback || null,
          })
          .eq("tenant_id", tenant.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from("ai_assistants").insert({
          tenant_id: tenant.id,
          greeting_script: scripts.greeting || null,
          fallback_script: scripts.fallback || null,
        });

        if (error) throw error;
      }

      toast.success("AI scripts updated successfully");
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
          <MessageSquare className="h-5 w-5" />
          AI Voice Scripts
        </CardTitle>
        <CardDescription>
          Customize what your AI says when greeting callers and when it doesn't understand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Greeting Script */}
        <div className="space-y-2">
          <Label htmlFor="greeting">Opening Greeting</Label>
          <Textarea
            id="greeting"
            placeholder={defaultGreeting}
            value={scripts.greeting}
            onChange={(e) => setScripts({ ...scripts, greeting: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            The first thing your AI says when answering a call. Leave blank to use the default.
          </p>
        </div>

        {/* Fallback Script */}
        <div className="space-y-2">
          <Label htmlFor="fallback">Fallback Response</Label>
          <Textarea
            id="fallback"
            placeholder={defaultFallback}
            value={scripts.fallback}
            onChange={(e) => setScripts({ ...scripts, fallback: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            What the AI says when it doesn't understand the caller. Leave blank to use the default.
          </p>
        </div>

        {/* Preview Card */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Greeting: </span>
              <span className="italic">"{scripts.greeting || defaultGreeting}"</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Fallback: </span>
              <span className="italic">"{scripts.fallback || defaultFallback}"</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Scripts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
