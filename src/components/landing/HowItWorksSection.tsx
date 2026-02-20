import { Settings, Bot, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    icon: Settings,
    title: "Sign up",
    description: "Create your account and tell us about your business",
    detail: "5 minutes",
  },
  {
    number: "2",
    icon: Bot,
    title: "Configure",
    description: "Add your services, hours, and preferences",
    detail: "10 minutes",
  },
  {
    number: "3",
    icon: BarChart3,
    title: "Go Live",
    description: "Start answering calls and capturing every lead",
    detail: "Instant",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(230_70%_62%/0.05),transparent)] pointer-events-none" />

      <div className="container relative">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold text-primary uppercase tracking-wider mb-4"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5"
          >
            Go live in{" "}
            <span className="text-gradient-primary">three steps</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed"
          >
            From sign-up to answering calls in under 15 minutes
          </motion.p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="relative group"
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-14 left-[60%] w-full items-center">
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
                    <ArrowRight className="h-4 w-4 text-primary/40 -ml-2" />
                  </div>
                )}

                <div className="text-center">
                  {/* Step icon with number */}
                  <div className="relative inline-flex mb-6">
                    <div className="h-28 w-28 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-[0_8px_32px_-8px_hsl(230_70%_62%/0.15)] transition-all duration-300">
                      <step.icon className="h-12 w-12 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center shadow-[0_0_20px_-4px_hsl(230_70%_62%/0.4)]">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground/80 mb-2">{step.description}</p>
                  <p className="text-sm text-primary font-medium">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
