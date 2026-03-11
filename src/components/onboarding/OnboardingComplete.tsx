import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, BookOpen, Phone as PhoneIcon, Settings, MapPin, Sparkles, Calendar, Wand2 } from "lucide-react";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { getIndustryOnboardingConfig, type NextStepItem } from "@/config/industryOnboardingConfig";

interface OnboardingCompleteProps {
  businessName: string;
  phoneNumber?: string;
  businessMode?: BusinessMode;
  scenarioAnswers?: Record<string, boolean>;
  industrySlug?: string;
}

const iconMap: Record<NextStepItem["icon"], typeof PhoneIcon> = {
  phone: PhoneIcon,
  calendar: Calendar,
  book: BookOpen,
  sparkles: Sparkles,
  map: MapPin,
  settings: Settings,
};

function getNextSteps(
  mode: BusinessMode = "service",
  answers: Record<string, boolean> = {},
  slug?: string
): { label: string; icon: typeof PhoneIcon }[] {
  if (slug) {
    const industryEntry = getIndustryBySlug(slug);
    const config = getIndustryOnboardingConfig(
      mode,
      industryEntry?.category,
      slug
    );
    return config.nextSteps.map((step) => ({
      label: step.label,
      icon: iconMap[step.icon] || Sparkles,
    }));
  }

  // Fallback for when no industry slug is set
  const isCallbackOnly = answers.aiBooksDirect === false;
  const steps: { label: string; icon: typeof PhoneIcon }[] = [];

  steps.push({ label: "Make a test call to hear your AI", icon: PhoneIcon });

  if (!isCallbackOnly && (mode === "service" || mode === "medical" || mode === "sales")) {
    steps.push({ label: "Connect your calendar for live scheduling", icon: Calendar });
  }

  if (mode === "dispatch") {
    steps.push({ label: "Set up your service area and coverage zones", icon: MapPin });
  }

  steps.push({ label: "Add FAQs so your AI can answer common questions", icon: BookOpen });
  steps.push({ label: "Customize your AI's greeting and scripts", icon: Sparkles });

  return steps;
}

export function OnboardingComplete({ businessName, phoneNumber, businessMode, scenarioAnswers, industrySlug }: OnboardingCompleteProps) {
  const navigate = useNavigate();
  const nextSteps = getNextSteps(businessMode, scenarioAnswers, industrySlug);

  // No auto-redirect — let users read the next steps at their own pace

  return (
    <div className="text-center space-y-6">
      {/* Animated success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
      >
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-success" strokeWidth={3} />
        </div>
      </motion.div>

      {/* Success message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold">
          {businessName ? `${businessName} is live!` : "You're all set!"}
        </h2>
        <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
          Your AI receptionist is ready to answer calls 24/7.
        </p>
      </motion.div>

      {/* Phone number + test call CTA */}
      {phoneNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <div className="py-4 px-6 rounded-lg bg-primary/5 border border-primary/20 inline-block">
            <p className="text-xs text-muted-foreground mb-1">Your AI phone number</p>
            <p className="text-xl font-semibold tracking-wide">{phoneNumber}</p>
          </div>
          <div>
            <a
              href={`tel:${phoneNumber.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <PhoneIcon className="h-4 w-4" />
              Call it now — hear your AI live
            </a>
          </div>
        </motion.div>
      )}

      {/* Next steps checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-left max-w-xs mx-auto space-y-3"
      >
        <p className="text-sm font-medium">You'll set these up next:</p>
        {nextSteps.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm text-muted-foreground">
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Primary CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-2 space-y-3"
      >
        <Button size="lg" className="w-full gap-2" asChild>
          <Link to="/app/business-brain?mode=setup">
            <Wand2 className="w-4 h-4" />
            Continue Setup
          </Link>
        </Button>
        <Link
          to="/app/dashboard"
          className="inline-block text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Skip to Dashboard
        </Link>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-muted-foreground"
      >
        Taking you to guided setup in a few seconds...
      </motion.p>
    </div>
  );
}
