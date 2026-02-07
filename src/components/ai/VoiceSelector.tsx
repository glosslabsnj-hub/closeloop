import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Check, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface VoiceOption {
  id: string;
  name: string;
  description: string | null;
}

interface VoiceSelectorProps {
  selected: string;
  onSelect: (voiceId: string) => void;
}

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  const { toast } = useToast();
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Fetch voice options from backend
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-voice-options");
        
        if (error) {
          console.error("Failed to fetch voice options:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load voice options",
          });
          return;
        }

        if (data?.voices) {
          setVoiceOptions(data.voices);
          // Auto-select first voice if none selected
          if (!selected && data.voices.length > 0) {
            onSelect(data.voices[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoices();
  }, []);

  const handlePreviewVoice = async (voice: VoiceOption) => {
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
      const sampleText = `Hi there! I'm ${voice.name}, and I'll be your AI assistant. How can I help you today?`;
      
      // Use fetch for binary audio response (SDK doesn't handle binary well)
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
            voiceId: voice.id // Send friendly ID, backend resolves to provider ID
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pick a Voice</CardTitle>
          <CardDescription>Choose the voice for your AI assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (voiceOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pick a Voice</CardTitle>
          <CardDescription>Choose the voice for your AI assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No voice options available.</p>
        </CardContent>
      </Card>
    );
  }

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
                  {voice.description || "AI voice assistant"}
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
