import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  category: string;
  created_at?: string;
}

export function useMarketingChatHistory(userId: string | undefined, sessionId: string) {
  return useQuery({
    queryKey: ["marketing-chat-history", userId, sessionId],
    enabled: !!userId && !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_marketing_chats" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });
}

export function useMarketingChat(userId: string | undefined) {
  const _qc = useQueryClient();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string, category: string) => {
    if (!userId) return;

    const userMsg: ChatMessage = { role: "user", content, category };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message to DB
    await supabase.from("admin_marketing_chats" as any).insert({
      user_id: userId,
      session_id: sessionId,
      role: "user",
      content,
      category,
    } as any);

    setIsStreaming(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-chat", {
        body: {
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          category,
        },
      });

      if (error) throw error;

      const assistantContent = data?.content || "I apologize, I couldn't generate a response. Please try again.";
      const assistantMsg: ChatMessage = { role: "assistant", content: assistantContent, category };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message to DB
      await supabase.from("admin_marketing_chats" as any).insert({
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        content: assistantContent,
        category,
      } as any);
    } catch (err) {
      console.error("Marketing chat error:", err);
      toast.error("Failed to get AI response. Try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [userId, sessionId, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearChat,
    sessionId,
  };
}

export function useSaveMarketingContent(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { category: string; title: string; content: string; metadata?: Record<string, any> }) => {
      const { error } = await supabase
        .from("admin_marketing_content" as any)
        .insert({ user_id: userId, ...params } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-saved-content", userId] });
      toast.success("Content saved to library");
    },
  });
}

export function useMarketingSavedContent(userId: string | undefined) {
  return useQuery({
    queryKey: ["marketing-saved-content", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_marketing_content" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        category: string;
        title: string;
        content: string;
        metadata: Record<string, any>;
        is_pinned: boolean;
        created_at: string;
      }>;
    },
  });
}

export function useTogglePinContent(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("admin_marketing_content" as any)
        .update({ is_pinned: params.is_pinned } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-saved-content", userId] }),
  });
}

export function useDeleteMarketingContent(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_marketing_content" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-saved-content", userId] });
      toast.success("Content deleted");
    },
  });
}
