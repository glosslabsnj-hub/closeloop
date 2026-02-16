import { Phone, Calendar, Users, Bot, BarChart3, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything you need to close more leads
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            One platform to answer, book, and manage — so you never miss an opportunity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card"
            >
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
