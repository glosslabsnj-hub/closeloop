/**
 * useBrainAssistant — Hook for the Brain Assistant chat interface
 *
 * Manages conversation state, sends messages to the brain-assistant edge function,
 * and handles applying/skipping proposed actions via writeBrainFact functions.
 */

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// writeBrainFact imports
import {
  createFAQ,
  createService,
  createObjectionResponse,
  updateBusinessPolicies,
  updateBusinessProfile,
  updateBusinessHours,
  updateServiceArea,
  createCustomKnowledge,
  updateService,
} from "@/lib/brain/writeBrainFact";

export interface BrainAction {
  id: string;
  type: string;
  description: string;
  data: Record<string, unknown>;
  preview?: string;
  requiresApproval: true;
  status?: "pending" | "applied" | "skipped" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: BrainAction[];
  timestamp: Date;
}

export interface UseBrainAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  applyAction: (actionId: string) => Promise<void>;
  skipAction: (actionId: string) => void;
  startGapAnalysis: () => Promise<void>;
  clearConversation: () => void;
  usage: { messages_today: number; limit: number } | null;
}

export function useBrainAssistant(): UseBrainAssistantReturn {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ messages_today: number; limit: number } | null>(null);

  const tenantId = tenant?.id;

  const sendMessage = useCallback(async (text: string) => {
    if (!tenantId || !text.trim()) return;

    setError(null);

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history for the API (just role + content)
      const conversationHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("brain-assistant", {
        body: {
          tenant_id: tenantId,
          messages: conversationHistory,
        },
      });

      if (fnError) throw new Error(fnError.message || "Failed to get response");

      const responseData = data as {
        message: string;
        actions: BrainAction[];
        usage: { messages_today: number; limit: number };
      };

      // Add assistant message with actions
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseData.message,
        actions: responseData.actions?.map(a => ({ ...a, status: "pending" as const })),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setUsage(responseData.usage);
    } catch (err: any) {
      console.error("[useBrainAssistant] Error:", err);
      const errMsg = err.message || "Something went wrong";
      setError(errMsg);

      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${errMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, messages]);

  const applyAction = useCallback(async (actionId: string) => {
    if (!tenantId) return;

    // Find the action in messages
    let targetAction: BrainAction | undefined;
    for (const msg of messages) {
      targetAction = msg.actions?.find(a => a.id === actionId);
      if (targetAction) break;
    }

    if (!targetAction) {
      toast.error("Action not found");
      return;
    }

    // Update action status to applying
    setMessages(prev =>
      prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a =>
          a.id === actionId ? { ...a, status: "applied" as const } : a
        ),
      }))
    );

    try {
      await executeAction(tenantId, targetAction);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["objection-responses"] });
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      queryClient.invalidateQueries({ queryKey: ["brain-completion"] });
      queryClient.invalidateQueries({ queryKey: ["assistant-settings"] });
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["brain-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["category-completion"] });

      toast.success(targetAction.description);
    } catch (err: any) {
      console.error("[useBrainAssistant] Apply error:", err);
      toast.error(`Failed to apply: ${err.message}`);

      // Revert status
      setMessages(prev =>
        prev.map(msg => ({
          ...msg,
          actions: msg.actions?.map(a =>
            a.id === actionId ? { ...a, status: "error" as const } : a
          ),
        }))
      );
    }
  }, [tenantId, messages, queryClient]);

  const skipAction = useCallback((actionId: string) => {
    setMessages(prev =>
      prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a =>
          a.id === actionId ? { ...a, status: "skipped" as const } : a
        ),
      }))
    );
  }, []);

  const startGapAnalysis = useCallback(async () => {
    await sendMessage("Analyze my Business Brain setup and tell me what I need to configure. Start with the most important items first.");
  }, [sendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setUsage(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    applyAction,
    skipAction,
    startGapAnalysis,
    clearConversation,
    usage,
  };
}

/**
 * Execute a BrainAction by mapping type to the correct writeBrainFact function.
 */
async function executeAction(tenantId: string, action: BrainAction): Promise<void> {
  const { type, data } = action;

  switch (type) {
    case "create_faq":
      await createFAQ(tenantId, {
        question: data.question as string,
        answer: data.answer as string,
        priority_weight: (data.priority_weight as number) ?? 0,
      });
      break;

    case "create_service":
      await createService(tenantId, {
        name: data.name as string,
        description: data.description as string | undefined,
        price_type: data.price_type as "fixed" | "starting_at" | "quote_only" | undefined,
        price_amount: data.price_amount as number | undefined,
        duration_minutes: data.duration_minutes as number | undefined,
      });
      break;

    case "create_objection":
      await createObjectionResponse(tenantId, {
        objection: data.objection as string,
        response: data.response as string,
        priority_weight: (data.priority_weight as number) ?? 0,
      });
      break;

    case "set_policy":
      await updateBusinessPolicies(tenantId, {
        cancellation_policy: data.cancellation_policy as string | undefined,
        deposit_policy: data.deposit_policy as string | undefined,
        refund_policy: data.refund_policy as string | undefined,
        payment_methods: data.payment_methods as string[] | undefined,
      });
      break;

    case "set_field": {
      const field = data.field as string;
      const value = data.value as string;
      await updateBusinessProfile(tenantId, { [field]: value });
      break;
    }

    case "set_hours":
      await updateBusinessHours(tenantId, data as Record<string, any>);
      break;

    case "set_greeting": {
      const field = data.field as string;
      const value = data.value as string;
      // Greeting/tone goes to assistant_settings via direct Supabase call
      // since writeBrainFact doesn't have updateAssistantSettings yet
      if (field === "ai_tone") {
        const { error } = await supabase
          .from("assistant_settings")
          .update({ settings_json: { ai_tone: value } } as any)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else if (field === "greeting_script") {
        const { error } = await supabase
          .from("assistant_settings")
          .update({ greeting_script: value } as any)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else if (field === "unknown_question_behavior") {
        const { error } = await supabase
          .from("assistant_settings")
          .update({ unknown_question_behavior: value } as any)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      }
      break;
    }

    case "set_area":
      await updateServiceArea(tenantId, data as Record<string, unknown>);
      break;

    case "create_knowledge":
      await createCustomKnowledge(tenantId, {
        type: data.type as "policy" | "upsell",
        title: data.title as string,
        content: data.content as string,
        priority_weight: (data.priority_weight as number) ?? 0,
      });
      break;

    case "update_service": {
      const serviceId = data.service_id as string;
      const updates = data.updates as Record<string, unknown>;
      if (!serviceId) throw new Error("service_id is required for update_service");
      await updateService(serviceId, tenantId, updates as any);
      break;
    }

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}
