import { Settings, Bot, BarChart3 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Settings,
    title: "Set up your business",
    description: "Tell us your services, hours, and how you want leads handled. Our guided setup takes about 10 minutes.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI answers every call",
    description: "Our AI greets callers naturally, answers questions about your business, and captures their details.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Jobs appear in your system",
    description: "Bookings, dispatch jobs, or orders flow directly to CloseLoop or push to your existing tools.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Go live in three simple steps
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-border" />
                )}
                
                {/* Step number badge */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-card border-2 border-border shadow-sm mb-6 relative">
                  <step.icon className={`h-10 w-10 ${step.color}`} />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number.replace('0', '')}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
