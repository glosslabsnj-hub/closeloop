import { Shield, Lock, Clock, Calendar, Phone, MessageSquare } from "lucide-react";

const signals = [
  { icon: Shield, label: "Enterprise-grade security" },
  { icon: Lock, label: "HIPAA compliant" },
  { icon: Clock, label: "99.9% uptime" },
  { icon: Calendar, label: "Google Calendar sync" },
  { icon: Phone, label: "Twilio powered" },
  { icon: MessageSquare, label: "Instant SMS follow-up" },
];

export function TrustSignalsBar() {
  return (
    <section className="py-8 border-y border-border/40 bg-muted/30">
      <div className="container">
        <p className="text-xs font-medium text-muted-foreground text-center mb-5 uppercase tracking-widest">
          Trusted by local businesses
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {signals.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
