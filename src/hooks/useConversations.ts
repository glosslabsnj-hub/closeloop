import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];

export interface ConversationWithDetails extends Conversation {
  lead: Lead | null;
  messages: Message[];
  lastMessage?: Message | null;
}

export function useConversations() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["conversations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      // Fetch conversations with lead info
      const { data: convos, error: convosError } = await supabase
        .from("conversations")
        .select(`
          *,
          lead:leads(*)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (convosError) throw convosError;

      // Fetch messages for all conversations
      const convoIds = convos.map((c) => c.id);
      if (convoIds.length === 0) return [];

      const { data: messages, error: msgsError } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", convoIds)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (msgsError) throw msgsError;

      // Group messages by conversation and attach last message
      const messagesByConvo = messages.reduce((acc, msg) => {
        if (!acc[msg.conversation_id]) {
          acc[msg.conversation_id] = [];
        }
        acc[msg.conversation_id].push(msg);
        return acc;
      }, {} as Record<string, Message[]>);

      return convos.map((convo) => ({
        ...convo,
        messages: messagesByConvo[convo.id] || [],
        lastMessage: messagesByConvo[convo.id]?.[0] || null,
      })) as ConversationWithDetails[];
    },
    enabled: !!tenant?.id,
  });

  return {
    conversations: conversationsQuery.data ?? [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    refetch: conversationsQuery.refetch,
  };
}

export function useMessages(conversationId: string | null) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ body }: { body: string }) => {
      if (!conversationId || !tenant?.id) throw new Error("Missing context");
      
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          tenant_id: tenant.id,
          body,
          direction: "outbound" as const,
          status: "queued" as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", tenant?.id] });
    },
    onError: (error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage,
    refetch: messagesQuery.refetch,
  };
}
