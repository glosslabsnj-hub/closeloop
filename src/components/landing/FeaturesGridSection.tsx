import { Phone, Calendar, Users, Bot, BarChart3, Zap } from "lucide-react";

const features = [
  {
    icon: Phone,
    title: "AI Calls",
    description: "24/7 answering — your AI receptionist picks up every call, qualifies leads, and captures details.",
  },
  {
    icon: Calendar,
    title: "Booking",
    description: "Automatic scheduling — syncs with your calendar and books appointments in real time.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Assign jobs to your team, track progress, and manage workloads from one dashboard.",
  },
  {
    icon: Bot,
    title: "Smart AI",
    description: "Learns your business, speaks naturally, and handles objections like a trained receptionist.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track every call, measure conversion rates, and see your ROI in real time.",
  },
  {
    icon: Zap,
    title: "Automations",
    description: "Trigger follow-ups, send confirmations, and connect to your existing tools automatically.",
  },
];

export function FeaturesGridSection() {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,hsl(230_70%_62%/0.06),transparent)] pointer-events-none" />

      <div className="container relative">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Features
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Everything you need to{" "}
            <span className="text-gradient-primary">close more leads</span>
          </h2>
          <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
            One platform to answer, book, and manage — so you never miss an opportunity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_8px_32px_-8px_hsl(230_70%_62%/0.12)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/10 text-primary mb-5 group-hover:bg-primary/15 group-hover:border-primary/20 transition-colors duration-300">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
