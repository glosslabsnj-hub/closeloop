import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square, Check, Volume2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface VoiceOption {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
}

// Known gender mapping for curated voices (until DB columns are added)
const VOICE_GENDER: Record<string, string> = {
  sarah: "female",
  jessica: "female",
  bella: "female",
  matilda: "female",
  adalina: "female",
  eric: "male",
  chris: "male",
  brian: "male",
  james: "male",
};

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
  const [genderFilter, setGenderFilter] = useState<string | null>(null);

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
          // Enrich with gender from known mapping
          const enriched = data.voices.map((v: VoiceOption) => ({
            ...v,
            gender: v.gender || VOICE_GENDER[v.id] || null,
          }));
          setVoiceOptions(enriched);
          if (!selected && enriched.length > 0) {
            onSelect(enriched[0].id);
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
      const sampleText = `Hi there! Thanks for calling. This is ${voice.name}, your AI receptionist. How can I help you today?`;

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
            voiceId: voice.id
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

  const filteredVoices = genderFilter
    ? voiceOptions.filter(v => v.gender === genderFilter)
    : voiceOptions;

  const femaleCount = voiceOptions.filter(v => v.gender === "female").length;
  const maleCount = voiceOptions.filter(v => v.gender === "male").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pick a Voice</CardTitle>
          <CardDescription>Choose the voice your callers will hear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
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
          <CardDescription>Choose the voice your callers will hear</CardDescription>
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
        <CardDescription>Choose the voice your callers will hear. Click preview to listen before selecting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gender filter */}
        <div className="flex gap-2">
          <Button
            variant={genderFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setGenderFilter(null)}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            All ({voiceOptions.length})
          </Button>
          <Button
            variant={genderFilter === "female" ? "default" : "outline"}
            size="sm"
            onClick={() => setGenderFilter("female")}
          >
            Female ({femaleCount})
          </Button>
          <Button
            variant={genderFilter === "male" ? "default" : "outline"}
            size="sm"
            onClick={() => setGenderFilter("male")}
          >
            Male ({maleCount})
          </Button>
        </div>

        {/* Voice list */}
        <div className="space-y-3">
          {filteredVoices.map((voice) => (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{voice.name}</p>
                    {voice.gender && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {voice.gender}
                      </Badge>
                    )}
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
        </div>
      </CardContent>
    </Card>
  );
}
