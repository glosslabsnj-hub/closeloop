import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const toneOptions = [
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "professional", label: "Professional", description: "Polished and formal" },
  { value: "luxury", label: "Luxury", description: "Refined and exclusive" },
  { value: "direct", label: "Direct", description: "Efficient and to-the-point" },
];

interface ToneSelectorProps {
  selected: string;
  onSelect: (tone: string) => void;
}

export default function ToneSelector({ selected, onSelect }: ToneSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Personality</CardTitle>
        <CardDescription>Set the tone of conversations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {toneOptions.map((tone) => (
          <button
            key={tone.value}
            onClick={() => onSelect(tone.value)}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              selected === tone.value
                ? "border-primary bg-primary/5"
                : "hover:bg-secondary"
            }`}
          >
            <p className="font-medium">{tone.label}</p>
            <p className="text-sm text-muted-foreground">{tone.description}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
