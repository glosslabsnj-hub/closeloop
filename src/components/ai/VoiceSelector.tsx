import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Check, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Available voices in your ElevenLabs agent
const voiceOptions = [
  { 
    id: "james", 
    name: "James", 
    description: "Professional and confident male voice",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ" // Liam voice ID as placeholder for James
  },
  { 
    id: "sarah", 
    name: "Sarah", 
    description: "Warm and friendly female voice",
    voiceId: "EXAVITQu4vr4xnSDxMaL" // Sarah voice ID
  },
];

interface VoiceSelectorProps {
  selected: string;
  onSelect: (voiceId: string) => void;
}

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  const { toast } = useToast();
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePreviewVoice = async (voice: typeof voiceOptions[0]) => {
    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
      if (playingVoice === voice.id) {
        setPlayingVoice(null);
        return;
      }
    }

    setPlayingVoice(voice.id);
    
    try {
      // Use ElevenLabs TTS to preview the voice
      const sampleText = `Hi there! I'm ${voice.name}, and I'll be your AI assistant. How can I help you today?`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: sampleText, 
            voiceId: voice.voiceId 
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate voice preview");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingVoice(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingVoice(null);
        setAudioElement(null);
        toast({
          variant: "destructive",
          title: "Playback Error",
          description: "Could not play voice preview",
        });
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error: any) {
      console.error("Voice preview error:", error);
      setPlayingVoice(null);
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: "Could not load voice preview. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pick a Voice</CardTitle>
        <CardDescription>Choose the voice for your AI assistant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {voiceOptions.map((voice) => (
          <div
            key={voice.id}
            className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
              selected === voice.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-secondary/50 hover:border-muted-foreground/30"
            }`}
            onClick={() => onSelect(voice.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{voice.name}</p>
                  {selected === voice.id && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {voice.description}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewVoice(voice);
                }}
                disabled={playingVoice !== null && playingVoice !== voice.id}
              >
                {playingVoice === voice.id ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
