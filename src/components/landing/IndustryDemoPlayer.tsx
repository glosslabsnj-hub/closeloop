import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Pause, Volume2, CheckCircle2, 
  ArrowRight, Truck, Utensils, Stethoscope, Wrench 
} from "lucide-react";
import { useIndustryDemos, IndustryDemo } from "@/hooks/useIndustryDemos";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const industryIcons: Record<string, React.ReactNode> = {
  service: <Wrench className="h-5 w-5" />,
  dispatch: <Truck className="h-5 w-5" />,
  food: <Utensils className="h-5 w-5" />,
  medical: <Stethoscope className="h-5 w-5" />,
};

const industryColors: Record<string, string> = {
  service: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  dispatch: "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20",
  food: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
  medical: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20",
};

export function IndustryDemoPlayer() {
  const { demos, loading } = useIndustryDemos(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectedDemo = demos.find((d) => d.industry_key === selectedKey);

  // Auto-select first demo with audio
  useEffect(() => {
    if (!selectedKey && demos.length > 0) {
      const firstWithAudio = demos.find((d) => d.audio_url);
      if (firstWithAudio) {
        setSelectedKey(firstWithAudio.industry_key);
      } else {
        setSelectedKey(demos[0].industry_key);
      }
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
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

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            Real Call Recordings
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hear How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Listen to real AI calls for your industry. See exactly what gets captured and how your customers experience it.
          </p>
        </div>

        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {demos.map((demo) => (
            <button
              key={demo.industry_key}
              onClick={() => handleSelect(demo.industry_key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
                selectedKey === demo.industry_key
                  ? `${industryColors[demo.industry_key]} border-current font-medium`
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {industryIcons[demo.industry_key]}
              <span>{demo.title}</span>
            </button>
          ))}
        </div>

        {selectedDemo && (
          <Card className="max-w-3xl mx-auto overflow-hidden">
            <CardContent className="p-0">
              {/* Audio Player */}
              <div className={cn(
                "p-6 transition-colors",
                industryColors[selectedDemo.industry_key]?.split(" ")[0]
              )}>
                {selectedDemo.audio_url ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={selectedDemo.audio_url}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleEnded}
                    />
                    
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-14 w-14 rounded-full shrink-0"
                        onClick={togglePlay}
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 ml-1" />
                        )}
                      </Button>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{selectedDemo.title} Demo Call</span>
                          <span className="text-muted-foreground">
                            {formatTime(progress)} / {formatTime(duration)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={progress}
                          onChange={handleSeek}
                          className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                      
                      <Volume2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Audio coming soon for this demo</p>
                  </div>
                )}
              </div>

              {/* What Happens Section */}
              <div className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  What happens during this call
                </h3>
                <ul className="space-y-3">
                  {selectedDemo.caption_bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Transcript Excerpt */}
                {selectedDemo.transcript_excerpt && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                    <p className="text-sm italic text-muted-foreground">
                      {selectedDemo.transcript_excerpt}
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-6 pt-6 border-t">
                  <Link 
                    to={`/signup?industry=${selectedDemo.industry_key}`}
                  >
                    <Button size="lg" className="w-full sm:w-auto gap-2">
                      Start with {selectedDemo.title}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
