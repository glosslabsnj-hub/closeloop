import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, Volume2, 
  ArrowRight, Truck, Utensils, Stethoscope, Wrench,
  Headphones
} from "lucide-react";
import { useIndustryDemos } from "@/hooks/useIndustryDemos";

const industryIcons: Record<string, React.ElementType> = {
  service: Wrench,
  dispatch: Truck,
  food: Utensils,
  medical: Stethoscope,
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
    <section className="py-20 md:py-28 bg-gradient-to-b from-secondary/40 to-secondary/20">
      <div className="container">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 gap-2 px-4 py-2">
            <Headphones className="h-4 w-4" />
            Real AI Calls
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Hear how it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Listen to real demo calls. Select your industry below.
          </p>
        </div>

        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {demos.map((demo) => {
            const DemoIcon = industryIcons[demo.industry_key] || Wrench;
            const isSelected = selectedKey === demo.industry_key;
            return (
              <Button
                key={demo.industry_key}
                variant={isSelected ? "default" : "outline"}
                onClick={() => handleSelect(demo.industry_key)}
                className={`gap-2 h-12 px-5 transition-all duration-200 ${
                  isSelected ? "shadow-lg scale-[1.02]" : "hover:scale-[1.02]"
                }`}
              >
                <DemoIcon className="h-5 w-5" />
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
            <Card className="overflow-hidden border-2 shadow-xl bg-card">
              {/* Player Header */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-7 md:p-10">
                <div className="flex items-start gap-5 mb-8">
                  <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 shadow-inner">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold mb-2">{selectedDemo.title}</h3>
                    <p className="text-muted-foreground">
                      {selectedDemo.transcript_excerpt || `Demo call for ${selectedDemo.title.toLowerCase()}`}
                    </p>
                  </div>
                </div>

                {/* Audio Controls */}
                {selectedDemo.audio_url ? (
                  <div className="space-y-5">
                    <audio
                      ref={audioRef}
                      src={selectedDemo.audio_url}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleEnded}
                    />
                    
                    <div className="flex items-center gap-5">
                      <Button
                        size="lg"
                        onClick={togglePlay}
                        className="h-16 w-16 rounded-full p-0 shadow-lg hover:scale-105 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7" />
                        ) : (
                          <Play className="h-7 w-7 ml-1" />
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
                        <div className="flex justify-between text-sm text-muted-foreground font-medium">
                          <span>{formatTime(progress)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Volume2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm italic">Demo recording coming soon. Contact us for a live demo.</p>
                  </div>
                )}
              </div>

              {/* Bullets */}
              <CardContent className="p-7 md:p-10 bg-muted/20">
                <h4 className="font-semibold mb-5 text-sm text-muted-foreground uppercase tracking-wider">
                  What happens during this call
                </h4>
                {bullets.length > 0 ? (
                  <ul className="space-y-4">
                    {bullets.map((bullet: string, i: number) => (
                      <li key={i} className="flex items-start gap-4">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-base pt-0.5">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-4 text-muted-foreground">
                    <li className="flex items-start gap-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">1</span>
                      <span className="pt-0.5">AI greets caller and identifies their needs</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">2</span>
                      <span className="pt-0.5">Answers questions about services and availability</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">3</span>
                      <span className="pt-0.5">Captures customer info and creates record</span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center mt-10">
              <Link to={`/signup?industry=${selectedDemo.industry_key}&mode=${industryModes[selectedDemo.industry_key] || 'service'}`}>
                <Button size="lg" className="gap-2 h-14 px-8 text-base font-semibold shadow-lg hover:scale-[1.02] transition-transform">
                  Start with {selectedDemo.title}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Setup takes ~10 minutes • 7-day free trial
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
