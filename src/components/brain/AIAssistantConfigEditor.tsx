import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  User, Mic, Settings, Sparkles, Volume2, Play, Square, Check, 
  Loader2, Save, ChevronLeft, Info, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Voice options with ElevenLabs IDs
const VOICE_OPTIONS = [
  { id: "sarah", name: "Sarah", description: "Warm and friendly", gender: "female", voiceId: "EXAVITQu4vr4xnSDxMaL" },
  { id: "roger", name: "Roger", description: "Professional and clear", gender: "male", voiceId: "CwhRBWXzGAHq8TQ4Fs17" },
  { id: "laura", name: "Laura", description: "Calm and reassuring", gender: "female", voiceId: "FGY2WhTYpPnrIDTdsKH5" },
  { id: "charlie", name: "Charlie", description: "Energetic and upbeat", gender: "male", voiceId: "IKne3meq5aSn9XLyUdCD" },
  { id: "jessica", name: "Jessica", description: "Sophisticated and polished", gender: "female", voiceId: "cgSgspJ2msm6clMCkdW9" },
  { id: "brian", name: "Brian", description: "Casual and relaxed", gender: "male", voiceId: "nPczCjzI2devNBz1zQrb" },
];

type ToneType = "friendly" | "professional" | "luxury" | "direct";
type PricingBehavior = "exact" | "range" | "callback";
type NoAvailabilityBehavior = "waitlist" | "suggest_next" | "callback";

interface AIAssistantConfig {
  name: string;
  greeting: string;
  fallback: string;
  tone: ToneType;
  voiceId: string;
  speed: number;
  pricingBehavior: PricingBehavior;
  noAvailabilityBehavior: NoAvailabilityBehavior;
  upsellEnabled: boolean;
  mentionPromotions: boolean;
  offerPremium: boolean;
  memoryEnabled: boolean;
  learningEnabled: boolean;
}

const defaultConfig: AIAssistantConfig = {
  name: "Alex",
  greeting: "Hi, thanks for calling {business_name}! This is {assistant_name}, your AI assistant. How can I help you today?",
  fallback: "I'd be happy to have someone call you back with more details. What's the best number to reach you?",
  tone: "friendly",
  voiceId: "sarah",
  speed: 1.0,
  pricingBehavior: "exact",
  noAvailabilityBehavior: "suggest_next",
  upsellEnabled: true,
  mentionPromotions: true,
  offerPremium: false,
  memoryEnabled: true,
  learningEnabled: true,
};

export function AIAssistantConfigEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<AIAssistantConfig>(defaultConfig);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState("identity");

  // Load existing settings
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["ai-assistant-config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data: assistant } = await supabase
        .from("ai_assistants")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("ai_policies_json")
        .eq("id", tenant.id)
        .single();
      
      if (!assistant) return null;
      
      const policies = tenantData?.ai_policies_json as Record<string, unknown> || {};
      
      return {
        name: assistant.name || "Alex",
        greeting: assistant.greeting_script || defaultConfig.greeting,
        fallback: assistant.fallback_script || defaultConfig.fallback,
        tone: assistant.tone || "friendly",
        voiceId: assistant.voice_id || "sarah",
        speed: 1.0,
        pricingBehavior: (policies.pricing_behavior as PricingBehavior) || "exact",
        noAvailabilityBehavior: (policies.no_availability_behavior as NoAvailabilityBehavior) || "suggest_next",
        upsellEnabled: (policies.upsell as { enabled?: boolean })?.enabled ?? true,
        mentionPromotions: (policies.mention_promotions as boolean) ?? true,
        offerPremium: (policies.offer_premium as boolean) ?? false,
        memoryEnabled: true,
        learningEnabled: true,
      } as AIAssistantConfig;
    },
    enabled: !!tenant?.id,
  });

  // Initialize config from saved data
  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: AIAssistantConfig) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      // Check if assistant exists
      const { data: existing } = await supabase
        .from("ai_assistants")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      
      const assistantData = {
        tenant_id: tenant.id,
        name: newConfig.name,
        greeting_script: newConfig.greeting,
        fallback_script: newConfig.fallback,
        tone: newConfig.tone,
        voice_id: newConfig.voiceId,
      };
      
      if (existing) {
        await supabase
          .from("ai_assistants")
          .update(assistantData)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("ai_assistants")
          .insert([assistantData]);
      }
      
      // Save behavior policies
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("ai_policies_json")
        .eq("id", tenant.id)
        .single();
      
      const existingPolicies = (tenantData?.ai_policies_json as Record<string, unknown>) || {};
      
      await supabase
        .from("tenants")
        .update({
          ai_policies_json: {
            ...existingPolicies,
            pricing_behavior: newConfig.pricingBehavior,
            no_availability_behavior: newConfig.noAvailabilityBehavior,
            upsell: { enabled: newConfig.upsellEnabled },
            mention_promotions: newConfig.mentionPromotions,
            offer_premium: newConfig.offerPremium,
          },
        })
        .eq("id", tenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-assistant-config"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("AI Assistant settings saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to save", { description: error.message });
    },
  });

  const updateConfig = <K extends keyof AIAssistantConfig>(key: K, value: AIAssistantConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Voice preview
  const handlePreviewVoice = useCallback(async (voiceId: string) => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
      if (playingVoice === voiceId) {
        setPlayingVoice(null);
        return;
      }
    }

    setPlayingVoice(voiceId);
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId);
    
    try {
      const sampleText = config.greeting
        .replace("{business_name}", tenant?.name || "our business")
        .replace("{assistant_name}", config.name);
      
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
            voiceId: voice?.voiceId || VOICE_OPTIONS[0].voiceId
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate preview");

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
        toast.error("Playback failed");
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error("Voice preview error:", error);
      setPlayingVoice(null);
      toast.error("Could not play preview");
    }
  }, [audioElement, config.greeting, config.name, playingVoice, tenant?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="identity" className="gap-2">
            <User className="h-4 w-4" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-2">
            <Mic className="h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-2">
            <Settings className="h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* IDENTITY TAB */}
        <TabsContent value="identity" className="space-y-6 mt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Assistant Name */}
              <div className="space-y-2">
                <Label htmlFor="assistant-name">Assistant Name</Label>
                <Input
                  id="assistant-name"
                  value={config.name}
                  onChange={(e) => updateConfig("name", e.target.value)}
                  placeholder="Alex"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  This is how your AI will introduce itself
                </p>
              </div>

              <Separator />

              {/* Greeting Message */}
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Textarea
                  id="greeting"
                  value={config.greeting}
                  onChange={(e) => updateConfig("greeting", e.target.value)}
                  rows={3}
                  placeholder="Hi, thanks for calling..."
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code className="px-1 bg-muted rounded">{"{business_name}"}</code>, <code className="px-1 bg-muted rounded">{"{assistant_name}"}</code>, <code className="px-1 bg-muted rounded">{"{time}"}</code>
                </p>
              </div>

              <Separator />

              {/* Personality Tone */}
              <div className="space-y-3">
                <Label>Personality Tone</Label>
                <RadioGroup
                  value={config.tone}
                  onValueChange={(v) => updateConfig("tone", v as ToneType)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="professional" id="tone-professional" />
                    <Label htmlFor="tone-professional" className="flex-1 cursor-pointer">
                      <span className="font-medium">Professional</span>
                      <span className="text-muted-foreground ml-2">— Formal, business-like</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="friendly" id="tone-friendly" />
                    <Label htmlFor="tone-friendly" className="flex-1 cursor-pointer">
                      <span className="font-medium">Friendly</span>
                      <span className="text-muted-foreground ml-2">— Warm, conversational</span>
                      <Badge variant="secondary" className="ml-2">Recommended</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="luxury" id="tone-luxury" />
                    <Label htmlFor="tone-luxury" className="flex-1 cursor-pointer">
                      <span className="font-medium">Luxury</span>
                      <span className="text-muted-foreground ml-2">— Refined, sophisticated</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="direct" id="tone-direct" />
                    <Label htmlFor="tone-direct" className="flex-1 cursor-pointer">
                      <span className="font-medium">Direct</span>
                      <span className="text-muted-foreground ml-2">— Efficient, to-the-point</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Preview Button */}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handlePreviewVoice(config.voiceId)}
                disabled={playingVoice !== null}
              >
                {playingVoice ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Preview Greeting
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOICE TAB */}
        <TabsContent value="voice" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Voice</CardTitle>
              <CardDescription>Choose the voice for your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {VOICE_OPTIONS.map((voice) => (
                  <div
                    key={voice.id}
                    className={cn(
                      "relative p-4 rounded-lg border cursor-pointer transition-all",
                      config.voiceId === voice.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted/50 hover:border-muted-foreground/30"
                    )}
                    onClick={() => updateConfig("voiceId", voice.id)}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-2xl">
                        {voice.gender === "female" ? "♀️" : "♂️"}
                      </div>
                      <p className="font-medium text-sm">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                      
                      {config.voiceId === voice.id && (
                        <Badge variant="default" className="absolute top-2 right-2">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVoice(voice.id);
                        }}
                        disabled={playingVoice !== null && playingVoice !== voice.id}
                      >
                        {playingVoice === voice.id ? (
                          <>
                            <Square className="h-3 w-3" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Speaking Speed */}
              <div className="space-y-3">
                <Label>Speaking Speed</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-12">Slow</span>
                  <Slider
                    value={[config.speed]}
                    onValueChange={([v]) => updateConfig("speed", v)}
                    min={0.7}
                    max={1.3}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12">Fast</span>
                </div>
                <p className="text-center text-sm font-medium">{config.speed.toFixed(1)}x</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BEHAVIOR TAB */}
        <TabsContent value="behavior" className="space-y-6 mt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Pricing Behavior */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">When customer asks for pricing:</Label>
                <RadioGroup
                  value={config.pricingBehavior}
                  onValueChange={(v) => updateConfig("pricingBehavior", v as PricingBehavior)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="exact" id="pricing-exact" />
                    <Label htmlFor="pricing-exact" className="cursor-pointer">
                      Always quote exact price
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="range" id="pricing-range" />
                    <Label htmlFor="pricing-range" className="cursor-pointer">
                      Give range ("Starting at...")
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="callback" id="pricing-callback" />
                    <Label htmlFor="pricing-callback" className="cursor-pointer">
                      Offer to have someone call back with quote
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* No Availability Behavior */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">When no availability:</Label>
                <RadioGroup
                  value={config.noAvailabilityBehavior}
                  onValueChange={(v) => updateConfig("noAvailabilityBehavior", v as NoAvailabilityBehavior)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="waitlist" id="avail-waitlist" />
                    <Label htmlFor="avail-waitlist" className="cursor-pointer">
                      Offer waitlist
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="suggest_next" id="avail-suggest" />
                    <Label htmlFor="avail-suggest" className="cursor-pointer">
                      Suggest next available time
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="callback" id="avail-callback" />
                    <Label htmlFor="avail-callback" className="cursor-pointer">
                      Take callback request
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Upselling Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Upselling:</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="upsell-related"
                      checked={config.upsellEnabled}
                      onCheckedChange={(v) => updateConfig("upsellEnabled", !!v)}
                    />
                    <Label htmlFor="upsell-related" className="cursor-pointer">
                      Suggest related services
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="upsell-promotions"
                      checked={config.mentionPromotions}
                      onCheckedChange={(v) => updateConfig("mentionPromotions", !!v)}
                    />
                    <Label htmlFor="upsell-promotions" className="cursor-pointer">
                      Mention current promotions
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="upsell-premium"
                      checked={config.offerPremium}
                      onCheckedChange={(v) => updateConfig("offerPremium", !!v)}
                    />
                    <Label htmlFor="upsell-premium" className="cursor-pointer">
                      Offer premium upgrades
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="space-y-6 mt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Fallback Script */}
              <div className="space-y-2">
                <Label htmlFor="fallback">Fallback Script</Label>
                <Textarea
                  id="fallback"
                  value={config.fallback}
                  onChange={(e) => updateConfig("fallback", e.target.value)}
                  rows={3}
                  placeholder="I'd be happy to have someone call you back..."
                />
                <p className="text-xs text-muted-foreground">
                  When AI doesn't understand something or needs to escalate
                </p>
              </div>

              <Separator />

              {/* Memory & Learning */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">AI Intelligence</Label>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Customer Memory</p>
                    <p className="text-xs text-muted-foreground">
                      Remember returning customers and their preferences
                    </p>
                  </div>
                  <Switch
                    checked={config.memoryEnabled}
                    onCheckedChange={(v) => updateConfig("memoryEnabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Adaptive Learning</p>
                    <p className="text-xs text-muted-foreground">
                      Learn patterns from conversations to improve responses
                    </p>
                  </div>
                  <Switch
                    checked={config.learningEnabled}
                    onCheckedChange={(v) => updateConfig("learningEnabled", v)}
                  />
                </div>
              </div>

              <Separator />

              {/* Warning about changes */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Changes affect live calls</p>
                  <p className="text-muted-foreground">
                    Updates will apply to all new calls immediately after saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
