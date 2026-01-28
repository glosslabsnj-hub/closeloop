import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

const voiceOptions = [
  { id: "alloy", name: "Alloy", description: "Balanced, professional" },
  { id: "echo", name: "Echo", description: "Warm, friendly" },
  { id: "fable", name: "Fable", description: "Expressive, engaging" },
  { id: "onyx", name: "Onyx", description: "Deep, authoritative" },
  { id: "nova", name: "Nova", description: "Bright, energetic" },
];

interface VoiceSelectorProps {
  selected: string;
  onSelect: (voiceId: string) => void;
}

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Voice</CardTitle>
        <CardDescription>Choose how your AI sounds</CardDescription>
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
              <div>
                <p className="font-medium">{voice.name}</p>
                <p className="text-sm text-muted-foreground">{voice.description}</p>
              </div>
              <Button variant="ghost" size="icon">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
