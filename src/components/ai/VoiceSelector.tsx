import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Play } from "lucide-react";
import { useState } from "react";

// ElevenLabs voice options - using real voice IDs
const voiceOptions = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Warm and professional", gender: "female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Deep and authoritative", gender: "male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Friendly and approachable", gender: "male" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Bright and energetic", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Soft and calming", gender: "female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Confident and clear", gender: "male" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Expressive and engaging", gender: "female" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", description: "Calm and reassuring", gender: "male" },
];

interface VoiceSelectorProps {
  selected: string;
  onSelect: (voiceId: string) => void;
}

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handlePreview = async (voiceId: string, voiceName: string) => {
    setPreviewingVoice(voiceId);
    try {
      // Use browser's built-in speech synthesis as a fallback preview
      // In production, this would call ElevenLabs TTS API
      const utterance = new SpeechSynthesisUtterance(
        `Hi, I'm ${voiceName}. I'll be your AI assistant, ready to help your customers.`
      );
      utterance.onend = () => setPreviewingVoice(null);
      utterance.onerror = () => setPreviewingVoice(null);
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error previewing voice:", error);
      setPreviewingVoice(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Voice</CardTitle>
        <CardDescription>Choose how your AI assistant sounds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {voiceOptions.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              selected === voice.id
                ? "border-primary bg-primary/5"
                : "hover:bg-secondary"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{voice.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">
                    ({voice.gender})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{voice.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(voice.id, voice.name);
                }}
                disabled={previewingVoice === voice.id}
              >
                {previewingVoice === voice.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
