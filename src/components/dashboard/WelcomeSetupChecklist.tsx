import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTerminology } from "@/hooks/useTerminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Check,
  Circle,
  Lock,
  ChevronRight,
  User,
  Building2,
  Package,
  Phone,
  Bot,
  FlaskConical,
  PartyPopper,
} from "lucide-react";

interface SetupStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
  locked: boolean;
}

interface WelcomeSetupChecklistProps {
  onSkip?: () => void;
  compact?: boolean;
}

export function WelcomeSetupChecklist({ onSkip, compact = false }: WelcomeSetupChecklistProps) {
  const { tenant, assistantSettings, user } = useAuth();
  const terms = useTerminology();
  const navigate = useNavigate();

  // Fetch counts for completion checks
  const { data: counts } = useQuery({
    queryKey: ["welcome-setup-counts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { services: 0, faqs: 0 };

      const [servicesResult, faqsResult] = await Promise.all([
        supabase
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("business_faqs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ]);

      return {
        services: servicesResult.count || 0,
        faqs: faqsResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  // Check completion states
  const accountCreated = !!user;
  
  const businessInfoComplete = !!(tenant?.name && tenant?.name.length > 0) && 
    !!((tenant as any)?.hours_json && Object.keys((tenant as any)?.hours_json || {}).length > 0);
  
  const servicesComplete = (counts?.services || 0) > 0;
  
  const phoneComplete = assistantSettings?.phone_connected || false;
  
  const aiCustomized = !!(assistantSettings as any)?.greeting_script || 
    (counts?.faqs || 0) >= 1;
  
  const testComplete = (assistantSettings as any)?.setup_step_tested || false;

  // Build steps with locking logic
  const steps: SetupStep[] = [
    {
      id: "account",
      number: 1,
      title: "Create account",
      description: "Sign up for CloseLoop",
      icon: User,
      href: "#",
      completed: accountCreated,
      locked: false,
    },
    {
      id: "business",
      number: 2,
      title: "Business information",
      description: "Name, address, hours",
      icon: Building2,
      href: "/app/business-brain?tab=identity",
      completed: businessInfoComplete,
      locked: !accountCreated,
    },
    {
      id: "services",
      number: 3,
      title: terms.addServicesStep || "Add your services",
      description: terms.addServicesDescription || "What you offer and pricing",
      icon: Package,
      href: "/app/business-brain?tab=offerings",
      completed: servicesComplete,
      locked: !businessInfoComplete,
    },
    {
      id: "phone",
      number: 4,
      title: "Set up your phone number",
      description: "Get your CloseLoop number",
      icon: Phone,
      href: "/app/business-brain?tab=ai-setup",
      completed: phoneComplete,
      locked: !servicesComplete,
    },
    {
      id: "customize",
      number: 5,
      title: "Customize your AI",
      description: "Voice, greeting, personality",
      icon: Bot,
      href: "/app/business-brain?tab=ai-setup",
      completed: aiCustomized,
      locked: !phoneComplete,
    },
    {
      id: "test",
      number: 6,
      title: "Make a test call",
      description: "Try it before going live",
      icon: FlaskConical,
      href: "/app/simulator",
      completed: testComplete,
      locked: !aiCustomized,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const allComplete = completedCount === steps.length;

  // Find the next actionable step
  const nextStep = steps.find((s) => !s.completed && !s.locked);

  const handleStepClick = (step: SetupStep) => {
    if (!step.locked && !step.completed) {
      navigate(step.href);
    }
  };

  return (
    <Card className={cn("overflow-hidden", compact && "border-0 shadow-none")}>
      {/* Header */}
      <div className={cn(
        "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6",
        compact && "p-4"
      )}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <PartyPopper className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={cn("font-semibold text-foreground", compact ? "text-lg" : "text-xl")}>
              {allComplete ? "You're all set!" : "Welcome to CloseLoop!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allComplete 
                ? "Your AI assistant is ready to take calls." 
                : "Let's get your AI assistant ready."}
            </p>
          </div>
        </div>
      </div>

      <CardContent className={cn("p-6", compact && "p-4")}>
        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActionable = !step.locked && !step.completed;
            const isNext = nextStep?.id === step.id;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={step.locked || step.completed}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all",
                  step.completed && "opacity-60",
                  step.locked && "opacity-40 cursor-not-allowed",
                  isActionable && "hover:bg-muted/50 cursor-pointer",
                  isNext && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                {/* Status indicator */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium",
                  step.completed && "bg-success text-success-foreground",
                  step.locked && "bg-muted text-muted-foreground",
                  isActionable && !isNext && "bg-muted text-foreground",
                  isNext && "bg-primary text-primary-foreground"
                )}>
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : step.locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    step.completed && "line-through text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {!step.completed && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {step.completed ? (
                    <span className="text-xs text-success font-medium">Complete</span>
                  ) : step.locked ? (
                    <span className="text-xs text-muted-foreground">Locked</span>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <span>{isNext ? "Start" : "Continue"}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">
              Progress: {completedCount} of {steps.length} complete
            </span>
            <span className="font-medium tabular-nums">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Skip option */}
          {onSkip && !allComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="w-full mt-4 text-muted-foreground hover:text-foreground"
            >
              Skip Setup - I'll do it later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
