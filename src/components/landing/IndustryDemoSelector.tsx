import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Pause, Volume2, CheckCircle2, 
  Sparkles, ArrowRight, Clock
} from "lucide-react";
import { industryDemos, IndustryDemo } from "@/data/industryDemos";

export function IndustryDemoSelector() {
  const [selectedDemo, setSelectedDemo] = useState<IndustryDemo>(industryDemos[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    // In production, this would control actual audio playback
    setIsPlaying(!isPlaying);
    
    // Simulate audio ending after duration
    if (!isPlaying) {
      const durationParts = selectedDemo.duration.split(':');
      const totalSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
      setTimeout(() => setIsPlaying(false), totalSeconds * 1000);
    }
  };

  const modeLabels: Record<string, string> = {
    service: 'Booking',
    dispatch: 'Dispatch',
    food: 'Orders',
    medical: 'Intake',
    general: 'Callback',
  };

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            <Volume2 className="h-3 w-3 mr-1" />
            Hear How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Listen to real AI calls
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your industry to hear how Flux Receptionist handles customer calls.
            These are real recorded demos showing exactly what your customers will experience.
          </p>
        </div>

        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {industryDemos.map((demo) => (
            <Button
              key={demo.id}
              variant={selectedDemo.id === demo.id ? "default" : "outline"}
              onClick={() => {
                setSelectedDemo(demo);
                setIsPlaying(false);
              }}
              className="gap-2"
            >
              <span>{demo.icon}</span>
              {demo.name}
            </Button>
          ))}
        </div>

        {/* Demo Player Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-accent/30 p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{selectedDemo.icon}</span>
                    <h3 className="text-xl font-bold">{selectedDemo.name}</h3>
                    <Badge variant="secondary">
                      {modeLabels[selectedDemo.businessMode]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {selectedDemo.callSummary}
                  </p>
                </div>
                
                {/* Play Button */}
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={handlePlayPause}
                    className="gap-2 h-14 px-6"
                    disabled={!selectedDemo.audioUrl}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-5 w-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Play Demo Call
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {selectedDemo.duration}
                  </div>
                </div>
              </div>
              
              {!selectedDemo.audioUrl && (
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Demo recording coming soon. Contact us to hear a live demo.
                </p>
              )}
            </div>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* What AI Does */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    What the AI does during this call
                  </h4>
                  <ul className="space-y-2">
                    {selectedDemo.whatAIDoes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What Gets Created */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    What gets created in the system
                  </h4>
                  <ul className="space-y-2">
                    {selectedDemo.whatGetsCreated.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Below Demo */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-4">
              Ready to have AI answer your calls like this?
            </p>
            <Button size="lg" className="gap-2" asChild>
              <a href="#pricing">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Setup takes about 10 minutes • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
