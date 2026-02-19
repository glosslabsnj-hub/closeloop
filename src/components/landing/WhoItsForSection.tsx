import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope, 
  DollarSign,
  ArrowRight,
  Check
} from "lucide-react";

const modes = [
  {
    icon: Wrench,
    title: "Service & Booking",
    description: "Auto shops, salons, contractors",
    bullets: [
      "Books to your open slots",
      "Sends deposit links",
    ],
    mode: "service",
    industry: "service",
  },
  {
    icon: Truck,
    title: "Dispatch & Urgent",
    description: "Towing, plumbing, HVAC",
    bullets: [
      "Captures location + urgency",
      "Real-time dispatch queue",
    ],
    mode: "dispatch",
    industry: "towing",
  },
  {
    icon: UtensilsCrossed,
    title: "Food & Reservations",
    description: "Restaurants, pizzerias, caterers",
    bullets: [
      "Takes orders + questions",
      "Books tables + catering",
    ],
    mode: "food",
    industry: "restaurant",
  },
  {
    icon: Stethoscope,
    title: "Medical Intake",
    description: "Dental, chiropractic, clinics",
    bullets: [
      "Collects patient info",
      "HIPAA-ready options",
    ],
    mode: "medical",
    industry: "medical",
  },
  {
    icon: DollarSign,
    title: "Sales & Lead Capture",
    description: "Dealerships, real estate, agencies",
    bullets: [
      "Qualifies leads instantly",
      "Books test drives & demos",
    ],
    mode: "sales",
    industry: "sales",
  },
];

export function WhoItsForSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Who it's for
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built for your business
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            The AI adapts to your industry and workflow
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-7xl mx-auto">
          {modes.map((mode) => (
            <Card 
              key={mode.mode} 
              className="group hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 bg-card"
            >
              <CardContent className="p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <mode.icon className="h-7 w-7" />
                </div>
                
                <h3 className="font-semibold text-lg mb-1">{mode.title}</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {mode.description}
                </p>
                
                <ul className="space-y-2.5 mb-5">
                  {mode.bullets.map((bullet, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to={`/signup?industry=${mode.industry}&mode=${mode.mode}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full group-hover:bg-primary/10 gap-2 font-medium"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-10">
          Don't see your industry?{" "}
          <a href="#demo" className="text-primary font-medium hover:underline">
            Hear how it sounds
          </a>
          {" "}— CloseLoop works for any inbound-call business.
        </p>
      </div>
    </section>
  );
}
