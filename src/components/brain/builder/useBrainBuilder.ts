/**
 * useBrainBuilder - Hook managing the AI Brain Builder conversation loop.
 * Sends messages to the edge function, processes extracted data,
 * and writes to the database via writeBrainFact functions.
 */

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  updateBusinessProfile,
  createService,
  updateBusinessPolicies,
  createFAQ,
  createCustomKnowledge,
} from "@/lib/brain/writeBrainFact";
import type {
  ChatMessage,
  BrainBuilderTopic,
  BrainBuilderResponse,
  ExtractedData,
} from "./types";
import { TOPIC_ORDER } from "./types";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useBrainBuilder() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTopic, setCurrentTopic] = useState<BrainBuilderTopic>("identity");
  const [completedTopics, setCompletedTopics] = useState<BrainBuilderTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const capabilities = (() => {
    const raw = (tenant as any)?.capabilities_json;
    if (raw && typeof raw === "object") return raw as Record<string, boolean>;
    return {};
  })();

  const processExtractedData = useCallback(
    async (dataItems: ExtractedData[]) => {
      if (!tenant?.id) return;
      const tenantId = tenant.id;

      for (const item of dataItems) {
        try {
          switch (item.action) {
            case "update_profile":
              await updateBusinessProfile(tenantId, item.data);
              queryClient.invalidateQueries({ queryKey: ["tenant-profile", tenantId] });
              break;

            case "upsert_hours": {
              const slots = item.data.slots || [];
              for (const slot of slots) {
                await supabase.from("availability_slots").upsert(
                  {
                    tenant_id: tenantId,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_available: slot.is_available !== false,
                  },
                  { onConflict: "tenant_id,day_of_week" }
                );
              }
              queryClient.invalidateQueries({ queryKey: ["availability-slots", tenantId] });
              break;
            }

            case "create_service":
              await createService(tenantId, {
                name: item.data.name,
                description: item.data.description,
                price_type: item.data.price_type || "fixed",
                price_amount: item.data.price_amount || null,
                duration_minutes: item.data.duration_minutes || 60,
              });
              queryClient.invalidateQueries({ queryKey: ["services-count", tenantId] });
              queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
              break;

            case "update_policies":
              await updateBusinessPolicies(tenantId, item.data);
              queryClient.invalidateQueries({ queryKey: ["tenant-profile", tenantId] });
              break;

            case "create_knowledge":
              await createCustomKnowledge(tenantId, {
                type: item.data.type || "policy",
                title: item.data.title,
                content: item.data.content,
              });
              break;

            case "update_ai_scripts": {
              const updates: Record<string, any> = {};
              if (item.data.greeting_script) updates.greeting_script = item.data.greeting_script;
              if (item.data.fallback_script) updates.fallback_script = item.data.fallback_script;
              if (item.data.tone) updates.tone = item.data.tone;

              await supabase
                .from("ai_assistants")
                .upsert(
                  { tenant_id: tenantId, ...updates },
                  { onConflict: "tenant_id" }
                );
              queryClient.invalidateQueries({ queryKey: ["ai-assistant", tenantId] });
              break;
            }

            case "create_faq":
              await createFAQ(tenantId, {
                question: item.data.question,
                answer: item.data.answer,
              });
              queryClient.invalidateQueries({ queryKey: ["faqs-count", tenantId] });
              queryClient.invalidateQueries({ queryKey: ["business-faqs", tenantId] });
              break;
          }
        } catch (err) {
          console.error(`[BrainBuilder] Failed to process ${item.action}:`, err);
        }
      }
    },
    [tenant?.id, queryClient]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!tenant?.id || isLoading) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("brain-builder-chat", {
          body: {
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            current_topic: currentTopic,
            completed_topics: completedTopics,
            business_mode: businessMode,
            capabilities,
          },
        });

        if (fnError) throw new Error(fnError.message || "Failed to get AI response");

        const response = data as BrainBuilderResponse;

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: response.message,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Process any extracted data
        if (response.extracted_data?.length) {
          await processExtractedData(response.extracted_data);
        }

        // Handle topic transitions
        if (response.is_topic_complete) {
          setCompletedTopics((prev) => {
            if (prev.includes(currentTopic)) return prev;
            return [...prev, currentTopic];
          });
        }

        if (response.is_all_complete) {
          setIsAllComplete(true);
        } else if (response.current_topic !== currentTopic) {
          setCurrentTopic(response.current_topic);
        }
      } catch (err) {
        console.error("[BrainBuilder] Error:", err);
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [tenant?.id, messages, currentTopic, completedTopics, businessMode, capabilities, isLoading, processExtractedData]
  );

  const startConversation = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;

    // Send an initial empty message to trigger the AI's greeting
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("brain-builder-chat", {
        body: {
          messages: [{ role: "user", content: "Hi, I'd like to set up my business." }],
          current_topic: "identity",
          completed_topics: [],
          business_mode: businessMode,
          capabilities,
        },
      });

      if (fnError) throw new Error(fnError.message);

      const response = data as BrainBuilderResponse;
      const greetingMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response.message,
        timestamp: Date.now(),
      };
      setMessages([greetingMsg]);
    } catch (err) {
      console.error("[BrainBuilder] Init error:", err);
      const fallback: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Hey! I'm here to help you set up your AI receptionist. Let's start with the basics — what's your business name and where are you located?",
        timestamp: Date.now(),
      };
      setMessages([fallback]);
    } finally {
      setIsLoading(false);
    }
  }, [businessMode, capabilities]);

  const reset = useCallback(() => {
    setMessages([]);
    setCurrentTopic("identity");
    setCompletedTopics([]);
    setIsAllComplete(false);
    setError(null);
    initialized.current = false;
  }, []);

  return {
    messages,
    currentTopic,
    completedTopics,
    isLoading,
    isAllComplete,
    error,
    sendMessage,
    startConversation,
    reset,
    topicOrder: TOPIC_ORDER,
  };
}
