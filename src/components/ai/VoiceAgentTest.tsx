import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DebugEvent {
  timestamp: number;
  type: string;
  data: any;
}

export default function VoiceAgentTest() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const addDebugEvent = useCallback((type: string, data: any) => {
    setDebugEvents(prev => [...prev.slice(-19), { timestamp: Date.now(), type, data }]);
  }, []);

  // Helper to ensure dynamic variables are safe (no nulls) and include businessname alias
  const toSafeVars = (vars: Record<string, any> | null | undefined): Record<string, string | number | boolean> => {
    if (!vars) return { businessname: "our business" };
    
    const safe = Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, v == null ? "" : v])
    );
    
    // Ensure businessname alias is always present (ElevenLabs expects no underscore)
    if (!safe.businessname && safe.business_name) {
      safe.businessname = safe.business_name;
    }
    if (!safe.businessname) {
      safe.businessname = "our business";
    }
    
    return safe;
  };

  const conversation = useConversation({
    onConnect: () => {
      console.log("🎙️ [VoiceTest] ✓ CONNECTED to ElevenLabs agent");
      addDebugEvent("CONNECTED", { status: conversation.status });
      toast({
        title: "Connected",
        description: "AI voice agent is now listening",
      });
    },
    onDisconnect: (details) => {
      console.log("🎙️ [VoiceTest] ⚠️ DISCONNECTED from ElevenLabs agent", details);
      addDebugEvent("DISCONNECTED", { status: conversation.status, details });
    },
    onMessage: (message) => {
      console.log("🎙️ [VoiceTest] Message:", message);
      addDebugEvent("MESSAGE", { role: message.role, source: message.source });
    },
    onError: (error: string) => {
      console.error("🎙️ [VoiceTest] ✗ ERROR:", error);
      addDebugEvent("ERROR", { message: error });
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: error || "Failed to connect to voice agent. Please try again.",
      });
    },
    onDebug: (event) => {
      console.log("🎙️ [VoiceTest] DEBUG:", event);
      addDebugEvent("DEBUG", event);
    },
    onStatusChange: (status) => {
      console.log("🎙️ [VoiceTest] STATUS_CHANGE:", status);
      addDebugEvent("STATUS", { status });
    },
  });

  const startConversation = useCallback(async () => {
    console.log("🎙️ [VoiceTest] Starting conversation flow...", { tenantId: tenant?.id });
    setIsConnecting(true);
    setDebugEvents([]); // Clear previous debug events
    setConversationId(null);

    try {
      // Request microphone permission
      console.log("🎙️ [VoiceTest] Step 1: Requesting microphone...");
      addDebugEvent("MIC_REQUEST", { status: "requesting" });
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎙️ [VoiceTest] ✓ Microphone granted");
      addDebugEvent("MIC_GRANTED", { status: "granted" });

      // Try WebRTC first, fallback to WebSocket
      let connectionMode: "webrtc" | "websocket" = "webrtc";

      console.log("🎙️ [VoiceTest] Step 2: Fetching token (WebRTC mode)...");
      addDebugEvent("TOKEN_REQUEST", { mode: "webrtc" });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { tenantId: tenant?.id, connectionType: connectionMode } }
      );

      if (error) {
        console.error("🎙️ [VoiceTest] ✗ Token error:", error);
        addDebugEvent("TOKEN_ERROR", { error: error.message });
        throw new Error(error.message || "Failed to get conversation token");
      }

      console.log("🎙️ [VoiceTest] ✓ Token response:", {
        connectionType: data?.connectionType,
        hasSignedUrl: !!data?.signedUrl,
        hasConversationId: !!data?.conversationId,
        conversationId: data?.conversationId,
        businessName: data?.dynamicVariables?.business_name,
        deployedVersion: data?.deployedVersion || "OLD_VERSION",
        fullDebug: data?._debug,
      });

      addDebugEvent("TOKEN_RECEIVED", {
        connectionType: data?.connectionType,
        hasSignedUrl: !!data?.signedUrl,
        conversationId: data?.conversationId,
        deployedVersion: data?.deployedVersion,
      });

      // Store conversationId if returned (WebRTC mode)
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        console.log("🎙️ [VoiceTest] ConversationID:", data.conversationId);
      }

      console.log("🎙️ [VoiceTest] Step 3: Starting session...");
      addDebugEvent("STARTING_SESSION", { mode: data?.connectionType || connectionMode });

      // Start session based on returned connection type
      if (data?.conversationId && data?.connectionType === "webrtc") {
        // WebRTC mode - use conversationToken (which is the conversationId)
        await conversation.startSession({
          conversationToken: data.conversationId,
          connectionType: "webrtc" as const,
          dynamicVariables: toSafeVars(data.dynamicVariables),
        });
      } else if (data?.signedUrl) {
        // WebSocket mode - use signed URL
        await conversation.startSession({
          signedUrl: data.signedUrl,
          connectionType: "websocket" as const,
          dynamicVariables: toSafeVars(data.dynamicVariables),
        });
      } else {
        throw new Error("No conversationId or signedUrl received from server");
      }

      console.log("🎙️ [VoiceTest] ✓ Session started");
      addDebugEvent("SESSION_STARTED", { status: "success" });
    } catch (error: any) {
      console.error("🎙️ [VoiceTest] ✗ Failed:", error);
      addDebugEvent("SESSION_ERROR", { error: error.message });
      toast({
        variant: "destructive",
        title: "Failed to Start",
        description: error.message || "Could not start voice conversation",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, tenant?.id, toast, addDebugEvent]);

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
              disabled={isConnecting}
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

        <p className="text-center text-sm text-muted-foreground">
          Speak naturally with your AI assistant. It will use your business knowledge to answer questions.
        </p>

        {/* Debug Events */}
        {debugEvents.length > 0 && (
          <details className="mt-6" open>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Debug Events ({debugEvents.length})
              {conversationId && <span className="ml-2 text-xs">ID: {conversationId.slice(0, 8)}...</span>}
            </summary>
            <div className="mt-2 max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs font-mono space-y-2">
              {debugEvents.map((event, idx) => {
                const time = new Date(event.timestamp).toLocaleTimeString();
                const dataStr = typeof event.data === "object"
                  ? JSON.stringify(event.data, null, 2)
                  : String(event.data);
                return (
                  <div key={idx} className="border-b border-muted pb-2 last:border-b-0">
                    <div className="flex gap-2 mb-1">
                      <span className="text-muted-foreground">{time}</span>
                      <span className="font-semibold text-primary">{event.type}</span>
                    </div>
                    <pre className="text-muted-foreground whitespace-pre-wrap break-all text-xs ml-2">
                      {dataStr}
                    </pre>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
