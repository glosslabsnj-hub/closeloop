import { ClipboardCheck, Settings, DollarSign, ChevronRight } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: ClipboardCheck,
    title: "Apply",
    description: "Submit your application below. We review and respond within 24 hours.",
    detail: "Free to join, no minimums",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    number: 2,
    icon: Settings,
    title: "Set Up Clients",
    description: "Pick an industry, configure the AI, and go live — 10 minutes per client.",
    detail: "100+ industry templates",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    number: 3,
    icon: DollarSign,
    title: "Earn",
    description: "Earn 20% recurring on every subscription, tracked in real-time in your dashboard.",
    detail: "Monthly payouts",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

export function AgencyHowItWorks() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From application to recurring revenue in three simple steps.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-14 left-[60%] right-[-40%] items-center justify-center z-0">
                    <div className="w-full border-t-2 border-dashed border-border" />
                    <ChevronRight className="h-5 w-5 text-muted-foreground -ml-1 shrink-0" />
                  </div>
                )}

                <div className={`group relative rounded-2xl border ${step.border} bg-card p-6 transition-all duration-300 hover:shadow-lg z-10`}>
                  {/* Step number badge */}
                  <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md">
                    {step.number}
                  </div>

                  <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${step.bg}`}>
                    <Icon className={`h-8 w-8 ${step.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <p className={`text-sm font-medium ${step.color}`}>{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
