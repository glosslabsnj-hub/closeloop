import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceAgentTestProps {
  agentId: string;
}

export default function VoiceAgentTest({ agentId }: VoiceAgentTestProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast({
        title: "Connected",
        description: "AI voice agent is now listening",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
    },
    onMessage: (message) => {
      console.log("Agent message:", message);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to voice agent. Please try again.",
      });
    },
  });

  const startConversation = useCallback(async () => {
    if (!agentId) {
      toast({
        variant: "destructive",
        title: "No Agent Configured",
        description: "Please configure your ElevenLabs Agent ID first.",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { agentId } }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "No token received");
      }

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (error: any) {
      console.error("Failed to start conversation:", error);
      toast({
        variant: "destructive",
        title: "Failed to Start",
        description: error.message || "Could not start voice conversation",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, agentId, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    toast({
      title: "Call Ended",
      description: "Voice conversation has ended",
    });
  }, [conversation, toast]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: The ElevenLabs SDK handles muting internally
  };

  const isConnected = conversation.status === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Voice Agent Test
        </CardTitle>
        <CardDescription>
          Test your AI voice assistant by having a live conversation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          {isConnected && (
            <Badge variant={conversation.isSpeaking ? "default" : "outline"}>
              {conversation.isSpeaking ? "AI Speaking" : "Listening"}
            </Badge>
          )}
        </div>

        {/* Visual Indicator */}
        {isConnected && (
          <div className="flex items-center justify-center py-8">
            <div className={`relative flex items-center justify-center`}>
              <div
                className={`h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center ${
                  conversation.isSpeaking ? "animate-pulse" : ""
                }`}
              >
                <div
                  className={`h-16 w-16 rounded-full bg-primary/40 flex items-center justify-center ${
                    conversation.isSpeaking ? "animate-pulse" : ""
                  }`}
                >
                  <Volume2
                    className={`h-8 w-8 text-primary ${
                      conversation.isSpeaking ? "animate-bounce" : ""
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isConnected ? (
            <Button
              size="lg"
              onClick={startConversation}
              disabled={isConnecting || !agentId}
              className="gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
              {isConnecting ? "Connecting..." : "Start Test Call"}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={toggleMute}
                className="gap-2"
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={stopConversation}
                className="gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>
            </>
          )}
        </div>

        {!agentId && (
          <p className="text-center text-sm text-muted-foreground">
            Configure your ElevenLabs Agent ID in Settings to test voice calls.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
