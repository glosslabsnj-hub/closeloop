import type { Capabilities } from "@/hooks/useCapabilities";
import type { IndustryTerms } from "@/lib/terminology";
import type React from "react";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
  skip?: boolean;
}

export interface SetupStepContext {
  serviceCount: number;
  servicesWithoutPrices: string[];
  faqCount: number;
  gapCount: number;
  hoursConfigured: boolean;
  hasCalendar: boolean;
  hasBooking: boolean;
  phoneConnected: boolean;
  tested: boolean;
  goLive: boolean;
  hangupRate: number;
  recentCallCount: number;
  caps: Capabilities;
  terms: IndustryTerms;
  menuItemCount: number;
  impoundConfigured: boolean;
  showStaffSection: boolean;
  showCurbsideSection: boolean;
  showNewPatientFormsSection: boolean;
}

// Icons are passed in from the component to avoid lucide imports in a lib file
export interface SetupStepIcons {
  Package: React.ElementType;
  UtensilsCrossed: React.ElementType;
  Clock: React.ElementType;
  HelpCircle: React.ElementType;
  Warehouse: React.ElementType;
  Users: React.ElementType;
  Car: React.ElementType;
  FileText: React.ElementType;
  Phone: React.ElementType;
  FlaskConical: React.ElementType;
  Rocket: React.ElementType;
  CalendarIcon: React.ElementType;
  AlertTriangle: React.ElementType;
}

/**
 * Builds a dynamic setup checklist from real tenant state.
 *
 * Dynamic descriptions use actual data when available:
 * - Services with missing prices are called out by name
 * - Knowledge gaps influence FAQ step messaging
 * - High hangup rate triggers specific guidance
 * - Calendar step appears only when booking is enabled but no calendar connected
 */
export function buildSetupSteps(
  ctx: SetupStepContext,
  icons: SetupStepIcons,
): SetupStep[] {
  const steps: SetupStep[] = [];

  // Step 1: Add offerings (mode-aware)
  if (ctx.caps.isFoodBusiness) {
    steps.push({
      id: "menu",
      label: ctx.terms.addServicesStep,
      description: ctx.menuItemCount > 0
        ? `${ctx.menuItemCount} menu items added`
        : ctx.terms.addServicesDescription,
      href: "/app/menu",
      icon: icons.UtensilsCrossed,
      completed: ctx.menuItemCount > 0,
    });
  } else if (ctx.serviceCount > 0 && ctx.servicesWithoutPrices.length > 0) {
    // Services exist but some are missing prices
    const missingNames = ctx.servicesWithoutPrices.slice(0, 3).join(", ");
    steps.push({
      id: "services",
      label: `Set prices for ${missingNames}`,
      description: "Your AI can't quote without prices",
      href: "/app/business-brain?section=services",
      icon: icons.Package,
      completed: false,
    });
  } else {
    steps.push({
      id: "services",
      label: ctx.terms.addServicesStep,
      description: ctx.serviceCount > 0
        ? `${ctx.serviceCount} services configured`
        : ctx.terms.addServicesDescription,
      href: "/app/business-brain?section=services",
      icon: icons.Package,
      completed: ctx.serviceCount > 0,
    });
  }

  // Step 2: Set hours
  steps.push({
    id: "hours",
    label: "Set your hours",
    description: ctx.hoursConfigured ? "Hours configured" : "When you're open for business",
    href: "/app/business-brain?section=hours",
    icon: icons.Clock,
    completed: ctx.hoursConfigured,
  });

  // Step 3: Add FAQs (business-aware description)
  if (ctx.faqCount >= 3) {
    steps.push({
      id: "faqs",
      label: "Add FAQs",
      description: `${ctx.faqCount} answers configured`,
      href: "/app/business-brain?section=knowledge",
      icon: icons.HelpCircle,
      completed: true,
    });
  } else if (ctx.gapCount > 0 && ctx.recentCallCount > 0) {
    steps.push({
      id: "faqs",
      label: "Add customer questions",
      description: `Your AI couldn't answer ${ctx.gapCount} question${ctx.gapCount === 1 ? "" : "s"} from callers`,
      href: "/app/business-brain?section=knowledge",
      icon: icons.HelpCircle,
      completed: false,
    });
  } else {
    steps.push({
      id: "faqs",
      label: "Add FAQs",
      description: "Common questions your AI can answer",
      href: "/app/business-brain?section=knowledge",
      icon: icons.HelpCircle,
      completed: false,
    });
  }

  // Step 4: Impound lot (dispatch + impound_lot only)
  if (ctx.caps.isDispatchBusiness && ctx.caps.hasImpoundLot) {
    steps.push({
      id: "impound",
      label: "Configure impound lot",
      description: "Lot address, fees, and release requirements",
      href: "/app/business-brain?section=impound",
      icon: icons.Warehouse,
      completed: ctx.impoundConfigured,
    });
  }

  // Mode-specific optional steps
  if (ctx.showStaffSection) {
    steps.push({
      id: "staff",
      label: "Add your staff members",
      description: "Set up technicians or team members for scheduling",
      href: "/app/business-brain?section=staff",
      icon: icons.Users,
      completed: false,
    });
  }

  if (ctx.showCurbsideSection) {
    steps.push({
      id: "curbside",
      label: "Set up curbside pickup",
      description: "Configure curbside pickup instructions",
      href: "/app/business-brain?section=ordering",
      icon: icons.Car,
      completed: false,
    });
  }

  if (ctx.showNewPatientFormsSection) {
    steps.push({
      id: "patient-forms",
      label: "Upload patient forms",
      description: "Add new patient intake forms for your practice",
      href: "/app/business-brain?section=forms",
      icon: icons.FileText,
      completed: false,
    });
  }

  // Calendar step — only when booking is enabled but no calendar connected
  if (ctx.hasBooking && !ctx.hasCalendar) {
    steps.push({
      id: "calendar",
      label: "Connect your calendar",
      description: "Booking is enabled but no calendar is connected",
      href: "/app/business-brain?section=calendar",
      icon: icons.CalendarIcon,
      completed: false,
    });
  }

  // Hangup rate warning step — only if enough data
  if (ctx.recentCallCount >= 10 && ctx.hangupRate > 0.35) {
    const pct = Math.round(ctx.hangupRate * 100);
    steps.push({
      id: "improve-greeting",
      label: "Improve your AI greeting",
      description: `${pct}% of callers are hanging up — refine your greeting`,
      href: "/app/business-brain?section=voice",
      icon: icons.AlertTriangle,
      completed: false,
    });
  }

  // Connect phone
  steps.push({
    id: "phone",
    label: "Connect phone",
    description: "Get your AI phone number",
    href: "/app/go-live",
    icon: icons.Phone,
    completed: ctx.phoneConnected,
  });

  // Test AI
  steps.push({
    id: "test",
    label: "Test AI",
    description: "Make sure everything works",
    href: "/app/simulator",
    icon: icons.FlaskConical,
    completed: ctx.tested,
  });

  // Go live
  steps.push({
    id: "golive",
    label: "Go live",
    description: "Start answering real calls",
    href: "/app/go-live",
    icon: icons.Rocket,
    completed: ctx.goLive,
  });

  return steps;
}
