import { Settings, Bot, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: Settings,
    title: "Set up your business",
    description: "Add your services, hours, and preferences",
    detail: "10-minute guided setup",
  },
  {
    number: "2",
    icon: Bot,
    title: "AI answers every call",
    description: "Greets callers and captures their info",
    detail: "24/7, unlimited calls",
  },
  {
    number: "3",
    icon: BarChart3,
    title: "Jobs appear instantly",
    description: "Bookings flow to Voxly or your system",
    detail: "Real-time delivery",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 bg-background relative">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/30 via-transparent to-transparent pointer-events-none" />
      
      <div className="container relative">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Go live in three steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From sign-up to answering calls in under 15 minutes
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-14 left-[60%] w-full items-center">
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-border to-transparent" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 -ml-2" />
                  </div>
                )}
                
                <div className="text-center">
                  {/* Step icon with number */}
                  <div className="relative inline-flex mb-6">
                    <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-card to-muted/50 border-2 border-border shadow-sm flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-md transition-all duration-300">
                      <step.icon className="h-12 w-12 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center shadow-lg">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-2">{step.description}</p>
                  <p className="text-sm text-primary font-medium">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
