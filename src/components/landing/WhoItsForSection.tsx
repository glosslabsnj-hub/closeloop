import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope, 
  ArrowRight 
} from "lucide-react";

const modes = [
  {
    icon: Wrench,
    title: "Service & Booking",
    description: "Auto shops, salons, contractors, detailers",
    bullets: [
      "AI books appointments to open slots",
      "Sends deposit links automatically",
    ],
    mode: "service",
    industry: "service",
  },
  {
    icon: Truck,
    title: "Dispatch & Urgent Jobs",
    description: "Towing, plumbing, HVAC, locksmiths",
    bullets: [
      "Captures location + urgency immediately",
      "Pushes to dispatch queue in real-time",
    ],
    mode: "dispatch",
    industry: "towing",
  },
  {
    icon: UtensilsCrossed,
    title: "Food Orders & Reservations",
    description: "Restaurants, pizzerias, caterers",
    bullets: [
      "Takes orders and menu questions",
      "Books tables and catering requests",
    ],
    mode: "food",
    industry: "restaurant",
  },
  {
    icon: Stethoscope,
    title: "Medical Intake",
    description: "Dental, chiropractic, clinics",
    bullets: [
      "Collects patient info + insurance",
      "HIPAA-ready workflow options",
    ],
    mode: "medical",
    industry: "medical",
  },
];

export function WhoItsForSection() {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for your business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The AI adapts to your industry and workflow
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {modes.map((mode) => (
            <Card 
              key={mode.mode} 
              className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <mode.icon className="h-6 w-6" />
                </div>
                
                <h3 className="font-semibold text-lg mb-1">{mode.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {mode.description}
                </p>
                
                <ul className="space-y-2 mb-4">
                  {mode.bullets.map((bullet, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to={`/signup?industry=${mode.industry}&mode=${mode.mode}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full group-hover:bg-primary/10 gap-2"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't see your industry? CloseLoop works for any inbound-call business.{" "}
          <a href="#demo" className="text-primary hover:underline">
            Hear how it sounds
          </a>
        </p>
      </div>
    </section>
  );
}
