import {
  Brain,
  LayoutGrid,
  LayoutDashboard,
  TrendingUp,
  Lock,
  BarChart3,
} from "lucide-react";

const valueProps = [
  {
    icon: Brain,
    title: "Deep AI, Not a Widget",
    description:
      "Full call handling that books appointments, dispatches jobs, and takes orders — not just a chatbot.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: LayoutGrid,
    title: "100+ Industry Templates",
    description:
      "Pre-built for plumbers, dentists, restaurants, tow companies, salons, and more. Go live in minutes.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: LayoutDashboard,
    title: "Real Client Dashboard",
    description:
      "Inbox, bookings, dispatch, reports, Business Brain — a full platform, not just settings.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: TrendingUp,
    title: "Higher Revenue Per Client",
    description:
      "Clients pay $249-$2,999/mo. At 20% commission, that's $50-$600 per client per month.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Lock,
    title: "Sticky Product",
    description:
      "AI embedded in daily operations — calendar, dispatch, orders. Once set up, clients don't leave.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: BarChart3,
    title: "Commission Transparency",
    description:
      "Real-time earnings tracking in your agency dashboard. See every client, every payout.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

export function AgencyValueProps() {
  return (
    <section className="py-20 md:py-28 bg-card/30">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Agencies Choose Us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A platform built for agencies that want to deliver real results — and get paid well for it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {valueProps.map((prop) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.title}
                className="group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${prop.bg}`}>
                  <Icon className={`h-6 w-6 ${prop.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{prop.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prop.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
