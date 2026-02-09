import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, LayoutDashboard, BookOpen, Phone as PhoneIcon, Settings } from "lucide-react";

interface OnboardingCompleteProps {
  businessName: string;
  phoneNumber?: string;
}

export function OnboardingComplete({ businessName, phoneNumber }: OnboardingCompleteProps) {
  const nextSteps = [
    { label: "Make a test call to hear your AI", icon: PhoneIcon },
    { label: "Add more FAQs to the Business Brain", icon: BookOpen },
    { label: "Connect your calendar for live booking", icon: Settings },
  ];

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
        <h2 className="text-2xl font-semibold">You're all set!</h2>
        <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
          Your AI receptionist is ready to start handling calls.
        </p>
      </motion.div>

      {/* Phone number */}
      {phoneNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="py-4 px-6 rounded-lg bg-primary/5 border border-primary/20 inline-block"
        >
          <p className="text-xs text-muted-foreground mb-1">Your AI phone number</p>
          <p className="text-xl font-semibold tracking-wide">{phoneNumber}</p>
        </motion.div>
      )}

      {/* Next steps checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-left max-w-xs mx-auto space-y-3"
      >
        <p className="text-sm font-medium">Recommended next steps</p>
        {nextSteps.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm text-muted-foreground">
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-2"
      >
        <Button size="lg" className="w-full gap-2" asChild>
          <Link to="/app/dashboard">
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-muted-foreground"
      >
        You can always edit your AI's knowledge from the Business Brain.
      </motion.p>
    </div>
  );
}
