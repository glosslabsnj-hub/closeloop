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
import { useTenantConfig } from "@/hooks/useTenantConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";

const defaultGreeting = "Hi, thanks for calling! How can I help you today?";
const defaultFallback = "I'm sorry, I didn't quite catch that. Could you please repeat?";

/**
 * Industry-aware greeting examples and helper text
 */
interface ModeContent {
  greetingExample: string;
  greetingTip: string;
  fallbackExample: string;
}

const MODE_CONTENT: Record<BusinessMode, ModeContent> = {
  service: {
    greetingExample: "Hi, thanks for calling [Business]! How can I help you today?",
    greetingTip: "Keep it friendly and professional. Let callers know they've reached the right place.",
    fallbackExample: "I'm sorry, I missed that. Could you tell me more about what you need?",
  },
  dispatch: {
    greetingExample: "This is [Business] dispatch. Do you need a tow or roadside assistance?",
    greetingTip: "Keep it short and action-oriented — callers in emergencies need fast help.",
    fallbackExample: "Sorry, I didn't catch that. Are you calling for a tow or roadside help?",
  },
  food: {
    greetingExample: "Thanks for calling [Restaurant]! Ready to take your order whenever you are.",
    greetingTip: "Sound welcoming and ready to help. Mention if you're taking orders or reservations.",
    fallbackExample: "I'm sorry, I missed that. Are you looking to order or make a reservation?",
  },
  medical: {
    greetingExample: "Thank you for calling [Practice]. How may I direct your call?",
    greetingTip: "Keep it professional and HIPAA-aware. Avoid discussing medical details in the greeting.",
    fallbackExample: "I'm sorry, I didn't catch that. Are you calling to schedule an appointment?",
  },
  general: {
    greetingExample: "Hi, thanks for calling [Business]! How can I help you today?",
    greetingTip: "Keep it simple and welcoming. Let callers know what kind of help you can provide.",
    fallbackExample: "I'm sorry, I missed that. Could you repeat what you need?",
  },
  sales: {
    greetingExample: "Hi, thanks for calling [Business]! Are you looking for information on our products?",
    greetingTip: "Sound enthusiastic and ready to help. Let callers know you can answer questions and schedule viewings.",
    fallbackExample: "I'm sorry, I missed that. Are you interested in learning about our available products or services?",
  },
};

export function AIScriptsEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [scripts, setScripts] = useState({ greeting: "", fallback: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const content = MODE_CONTENT[businessMode] || MODE_CONTENT.general;

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
          placeholder={content.greetingExample}
          value={scripts.greeting}
          onChange={(e) => setScripts({ ...scripts, greeting: e.target.value })}
          rows={2}
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/80">This is the first thing your AI says when it picks up the phone.</p>
          <p>{content.greetingTip}</p>
          <p className="text-primary/70">
            Example: "{content.greetingExample}"
          </p>
        </div>
      </div>

      {/* Fallback */}
      <div className="space-y-2">
        <Label>What should AI say when confused?</Label>
        <Textarea
          placeholder={content.fallbackExample}
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
