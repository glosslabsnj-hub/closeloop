import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, Volume2, 
  ArrowRight, Truck, Utensils, Stethoscope, Wrench 
} from "lucide-react";
import { useIndustryDemos } from "@/hooks/useIndustryDemos";
import { cn } from "@/lib/utils";

const industryIcons: Record<string, React.ElementType> = {
  service: Wrench,
  dispatch: Truck,
  food: Utensils,
  medical: Stethoscope,
};

const industryLabels: Record<string, string> = {
  service: "Service & Booking",
  dispatch: "Towing & Dispatch",
  food: "Restaurant",
  medical: "Medical / Dental",
};

const industryModes: Record<string, string> = {
  service: "service",
  dispatch: "dispatch",
  food: "food",
  medical: "medical",
};

export function IndustryDemoPlayer() {
  const { demos, loading } = useIndustryDemos(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectedDemo = demos.find((d) => d.industry_key === selectedKey);
  const Icon = selectedKey ? industryIcons[selectedKey] || Wrench : Wrench;

  // Auto-select first demo
  useEffect(() => {
    if (!selectedKey && demos.length > 0) {
      const firstWithAudio = demos.find((d) => d.audio_url);
      setSelectedKey(firstWithAudio?.industry_key || demos[0].industry_key);
    }
  }, [demos, selectedKey]);

  const handleSelect = (key: string) => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setSelectedKey(key);
    setProgress(0);
  };

  const togglePlay = () => {
    if (!audioRef.current || !selectedDemo?.audio_url) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading || demos.length === 0) {
    return null;
  }

  const bullets = selectedDemo?.caption_bullets || [];

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4 gap-2">
            <Volume2 className="h-3 w-3" />
            Real AI Calls
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hear how it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Listen to real demo calls. Select your industry and hear exactly what your customers will experience.
          </p>
        </div>

        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {demos.map((demo) => {
            const DemoIcon = industryIcons[demo.industry_key] || Wrench;
            const isSelected = selectedKey === demo.industry_key;
            return (
              <Button
                key={demo.industry_key}
                variant={isSelected ? "default" : "outline"}
                onClick={() => handleSelect(demo.industry_key)}
                className={`gap-2 h-12 px-5 transition-all ${
                  isSelected ? "shadow-md" : ""
                }`}
              >
                <DemoIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{demo.title}</span>
                <span className="sm:hidden">
                  {demo.industry_key.charAt(0).toUpperCase() + demo.industry_key.slice(1)}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Demo Player */}
        {selectedDemo && (
          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden border-2 shadow-lg">
              {/* Player Header */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/20 p-6 md:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1">{selectedDemo.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {selectedDemo.transcript_excerpt || `Demo call for ${selectedDemo.title.toLowerCase()}`}
                    </p>
                  </div>
                </div>

                {/* Audio Controls */}
                {selectedDemo.audio_url ? (
                  <div className="space-y-4">
                    <audio
                      ref={audioRef}
                      src={selectedDemo.audio_url}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleEnded}
                    />
                    
                    <div className="flex items-center gap-4">
                      <Button
                        size="lg"
                        onClick={togglePlay}
                        className="h-14 w-14 rounded-full p-0 shadow-lg"
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 ml-1" />
                        )}
                      </Button>
                      
                      <div className="flex-1 space-y-2">
                        <Slider
                          value={[progress]}
                          max={duration || 100}
                          step={0.1}
                          onValueChange={handleSeek}
                          className="cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime(progress)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm italic">Demo recording coming soon. Contact us for a live demo.</p>
                  </div>
                )}
              </div>

              {/* Bullets */}
              <CardContent className="p-6 md:p-8">
                <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  What happens during this call
                </h4>
                {bullets.length > 0 ? (
                  <ul className="space-y-3">
                    {bullets.map((bullet: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm md:text-base">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">1</span>
                      <span>AI greets caller and identifies their needs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">2</span>
                      <span>Answers questions about services and availability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">3</span>
                      <span>Captures customer info and creates record</span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center mt-8">
              <Link to={`/signup?industry=${selectedDemo.industry_key}&mode=${industryModes[selectedDemo.industry_key] || 'service'}`}>
                <Button size="lg" className="gap-2 h-12 px-6">
                  Start with {selectedDemo.title}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-3">
                Setup takes ~10 minutes • 7-day free trial
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
