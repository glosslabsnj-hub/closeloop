import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function FinalCTASection() {
  return (
    <section className="dark py-28 md:py-36 relative overflow-hidden bg-gradient-to-br from-[hsl(230,50%,12%)] via-[hsl(240,40%,10%)] to-[hsl(260,30%,8%)]">
      {/* Spotlight glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,hsl(230_70%_62%/0.25),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,hsl(280_60%_55%/0.1),transparent)] pointer-events-none" />
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="container text-center relative">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-[3.5rem] font-extrabold mb-6 tracking-tight text-foreground leading-[1.1]"
        >
          Stop missing customers
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg md:text-xl text-muted-foreground/80 mb-14 max-w-2xl mx-auto leading-relaxed"
        >
          Every unanswered call is lost revenue. Start capturing every lead today.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Link to="/signup">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2.5 h-14 px-10 text-[15px] font-semibold shadow-[0_0_40px_-8px_hsl(230_70%_62%/0.4)] hover:shadow-[0_0_50px_-6px_hsl(230_70%_62%/0.5)] hover:scale-[1.02] transition-all duration-300"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm text-muted-foreground/60 mb-14"
        >
          Or call us:{" "}
          <a href="tel:+18005551234" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            (800) 555-1234
          </a>
        </motion.p>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
          {["Setup in minutes", "No commitment", "Cancel anytime"].map((text, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.1 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/20 backdrop-blur-sm border border-border/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[13px] font-medium text-foreground/70">{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
