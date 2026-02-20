import { Shield, Lock, Clock, Calendar, Phone, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

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
    <section className="py-10 border-y border-border/20 bg-card/30 backdrop-blur-sm">
      <div className="container">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-medium text-muted-foreground/60 text-center mb-6 uppercase tracking-widest"
        >
          Trusted by local businesses
        </motion.p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {signals.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/20 text-muted-foreground/80"
            >
              <s.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
