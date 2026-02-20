import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      delay: 0.15 + i * 0.12,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-32 md:pt-36 md:pb-44 lg:pt-44 lg:pb-56">
      {/* Dramatic background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background pointer-events-none" />

      {/* Primary spotlight - top center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,hsl(230_70%_62%/0.18),transparent)] pointer-events-none" />

      {/* Secondary glow - purple accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_65%_20%,hsl(280_60%_55%/0.08),transparent)] pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Animated badge with gradient border */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-primary mb-12 backdrop-blur-md bg-primary/[0.06] border border-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered for Local Businesses</span>
          </motion.div>

          {/* Headline with dramatic gradient */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-[5rem] mb-8 leading-[1.05]"
          >
            <span className="text-foreground">Your AI Receptionist</span>
            <br />
            <span className="text-gradient-primary">
              That Never Sleeps
            </span>
          </motion.h1>

          {/* Subheadline with more breathing room */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-lg md:text-xl text-muted-foreground/80 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Answer every call, book appointments, and capture leads
            24/7 — no extra staff needed.
          </motion.p>

          {/* CTAs with glow effect */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
          >
            <Link to="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2.5 h-14 px-10 text-[15px] font-semibold shadow-[0_0_40px_-8px_hsl(230_70%_62%/0.4)] hover:shadow-[0_0_50px_-6px_hsl(230_70%_62%/0.5)] hover:scale-[1.02] transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto gap-2.5 h-14 px-10 text-[15px] font-medium border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-border/60 transition-all duration-300"
              >
                <Play className="h-4 w-4 fill-current" />
                See How It Works
              </Button>
            </a>
          </motion.div>

          {/* Trust bullets — glass pills */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-10"
          >
            {["No missed calls", "Real data, not voicemails", "Works while you sleep"].map((text) => (
              <div key={text} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/30 backdrop-blur-sm border border-border/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[13px] font-medium text-foreground/70">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Micro-copy */}
          <motion.p
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[13px] text-muted-foreground/50"
          >
            7-day free trial &middot; 30 minutes included &middot; Setup in under 10 min
          </motion.p>
        </div>
      </div>
    </section>
  );
}
