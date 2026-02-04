import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PreviewSentence } from "./layout/BusinessBrainSectionCard";

const defaultGreeting = "Hi, thanks for calling! How can I help you today?";
const defaultFallback = "I'm sorry, I didn't quite catch that. Could you please repeat?";

// Industry-specific greeting examples for helper text
const greetingExamples = {
  service: "Hi, thanks for calling [Business]! How can I help you today?",
  food: "Thanks for calling [Business], ready to take your order!",
  dispatch: "This is [Business] dispatch, do you need a tow?",
  medical: "Thank you for calling [Practice], how may I direct your call?",
};

export function AIScriptsEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [scripts, setScripts] = useState({ greeting: "", fallback: "" });
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
        if (!error) {
          setScripts({
            greeting: data?.greeting_script || "",
            fallback: data?.fallback_script || "",
          });
        }
      } catch (error) {
        console.error("Failed to load:", error);
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
      const { data: existing } = await supabase
        .from("ai_assistants")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("ai_assistants")
          .update({
            greeting_script: scripts.greeting || null,
            fallback_script: scripts.fallback || null,
          })
          .eq("tenant_id", tenant.id);
      } else {
        await supabase.from("ai_assistants").insert({
          tenant_id: tenant.id,
          greeting_script: scripts.greeting || null,
          fallback_script: scripts.fallback || null,
        });
      }
      toast.success("Scripts saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSentence sentence={scripts.greeting || defaultGreeting} />

      {/* Greeting */}
      <div className="space-y-2">
        <Label>How should your AI answer calls?</Label>
        <Textarea
          placeholder={defaultGreeting}
          value={scripts.greeting}
          onChange={(e) => setScripts({ ...scripts, greeting: e.target.value })}
          rows={2}
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>First thing callers hear. Leave blank to use default.</p>
          <p className="text-primary/70">
            Examples: "{greetingExamples.service}" or "{greetingExamples.food}"
          </p>
        </div>
      </div>

      {/* Fallback */}
      <div className="space-y-2">
        <Label>What should AI say when confused?</Label>
        <Textarea
          placeholder={defaultFallback}
          value={scripts.fallback}
          onChange={(e) => setScripts({ ...scripts, fallback: e.target.value })}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          When AI doesn't understand something, it says this to recover gracefully.
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
