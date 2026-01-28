import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Phone,
  Play,
  Mic,
  Volume2,
  MessageSquare,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const voiceOptions = [
  { id: "alloy", name: "Alloy", description: "Balanced, professional" },
  { id: "echo", name: "Echo", description: "Warm, friendly" },
  { id: "fable", name: "Fable", description: "Expressive, engaging" },
  { id: "onyx", name: "Onyx", description: "Deep, authoritative" },
  { id: "nova", name: "Nova", description: "Bright, energetic" },
];

const toneOptions = [
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "professional", label: "Professional", description: "Polished and formal" },
  { value: "luxury", label: "Luxury", description: "Refined and exclusive" },
  { value: "direct", label: "Direct", description: "Efficient and to-the-point" },
];

const demoFAQs = [
  { id: "1", title: "What are your hours?", content: "We're open Monday through Friday from 9am to 5pm, and Saturday from 10am to 2pm." },
  { id: "2", title: "How long does a full detail take?", content: "A full detail typically takes 3-4 hours depending on the size and condition of the vehicle." },
  { id: "3", title: "Do you offer mobile service?", content: "Yes! We can come to your home or office for an additional $25 travel fee." },
];

export default function AIAssistantPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("echo");
  const [selectedTone, setSelectedTone] = useState("friendly");
  const [greeting, setGreeting] = useState("Hi, thank you for calling! How can I help you today?");
  const [fallback, setFallback] = useState("I'd be happy to have someone call you back. What's the best number to reach you?");
  const [testing, setTesting] = useState(false);

  const handleTestCall = () => {
    setTesting(true);
    toast({
      title: "🎙️ AI Test Call",
      description: "Listen to how your AI assistant sounds...",
    });
    setTimeout(() => {
      setTesting(false);
      toast({
        title: "✅ Test Complete",
        description: "Your AI assistant is ready to take calls!",
      });
    }, 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">Configure your AI voice assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={handleTestCall} disabled={testing}>
            <Play className="h-4 w-4" />
            {testing ? "Testing..." : "Test AI Call"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">AI Enabled</span>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </div>
        </div>
      </div>

      {/* Main Banner */}
      <Card className={aiEnabled ? "border-primary/50 bg-primary/5" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${aiEnabled ? "bg-primary" : "bg-muted"}`}>
              <Bot className={`h-8 w-8 ${aiEnabled ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {aiEnabled ? "AI Assistant is Active" : "AI Assistant is Off"}
              </h2>
              <p className="text-muted-foreground">
                {aiEnabled
                  ? "Your AI is answering calls and booking appointments 24/7"
                  : "Enable AI to start answering calls automatically"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="voice" className="gap-2">
            <Mic className="h-4 w-4" />
            Voice & Tone
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        {/* Voice & Tone Tab */}
        <TabsContent value="voice" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Voice Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voice</CardTitle>
                <CardDescription>Choose how your AI sounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {voiceOptions.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedVoice === voice.id
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

            {/* Tone Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personality</CardTitle>
                <CardDescription>Set the tone of conversations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {toneOptions.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => setSelectedTone(tone.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTone === tone.value
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
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Greeting Script</CardTitle>
              <CardDescription>What your AI says when answering calls</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                placeholder="Hi, thank you for calling..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fallback Script</CardTitle>
              <CardDescription>When AI needs to escalate to a human</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                rows={3}
                placeholder="I'd be happy to have someone call you back..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">FAQs</CardTitle>
                  <CardDescription>Answers to common questions</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoFAQs.map((faq) => (
                <div key={faq.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{faq.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{faq.content}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => toast({ title: "Settings saved!" })}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
