/**
 * BrainDashboard - Simplified dashboard view of Business Brain
 * 
 * Shows all categories as collapsed cards with status indicators.
 * Designed for quick overview and navigation after initial setup.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  Sparkles, 
  Phone,
  Building2,
  Clock,
  Package,
  MapPin,
  Calendar,
  Shield,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { CategoryCard, type CategoryStatus } from "./CategoryCard";
import { getModeTheme, getModeDisplayName } from "../layout/ModeTheme";

interface BrainDashboardProps {
  onNavigateToSection: (sectionId: string) => void;
  onStartInterview?: () => void;
}

interface CategoryConfig {
  id: string;
  title: string;
  icon: typeof Building2;
  sectionId: string;
  getSummary: (summaries: ReturnType<typeof useBrainSummaries>) => string;
  getStatus: (summaries: ReturnType<typeof useBrainSummaries>) => CategoryStatus;
  isEssential?: boolean;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "identity",
    title: "Business Identity",
    icon: Building2,
    sectionId: "profile",
    getSummary: (s) => s.businessInfo,
    getStatus: (s) => s.businessInfo.includes("Not configured") ? "incomplete" : "complete",
    isEssential: true,
  },
  {
    id: "hours",
    title: "Operating Hours",
    icon: Clock,
    sectionId: "hours",
    getSummary: (s) => s.hours,
    getStatus: (s) => s.hours === "No hours set yet" ? "incomplete" : "complete",
    isEssential: true,
  },
  {
    id: "offerings",
    title: "Services & Pricing",
    icon: Package,
    sectionId: "services",
    getSummary: (s) => s.catalog,
    getStatus: (s) => s.catalog === "No items added yet" ? "incomplete" : "complete",
    isEssential: true,
  },
  {
    id: "coverage",
    title: "Service Area & ETA",
    icon: MapPin,
    sectionId: "service-area",
    getSummary: (s) => s.coverage,
    getStatus: () => "complete", // Usually optional
  },
  {
    id: "calendar",
    title: "Calendar & Availability",
    icon: Calendar,
    sectionId: "availability",
    getSummary: (s) => s.calendar,
    getStatus: (s) => s.calendar.includes("Connect") ? "incomplete" : "complete",
  },
  {
    id: "policies",
    title: "Policies & Intake",
    icon: Shield,
    sectionId: "policies",
    getSummary: (s) => s.policies,
    getStatus: (s) => s.policies === "No policies configured yet" ? "incomplete" : "complete",
  },
  {
    id: "ai-setup",
    title: "AI Scripts & Behavior",
    icon: Sparkles,
    sectionId: "ai-behavior",
    getSummary: (s) => s.scripts,
    getStatus: (s) => s.scripts === "Using default greeting" ? "incomplete" : "complete",
    isEssential: true,
  },
  {
    id: "knowledge",
    title: "FAQs & Training",
    icon: BookOpen,
    sectionId: "knowledge",
    getSummary: (s) => s.faqs,
    getStatus: (s) => s.faqs === "No FAQs added yet" ? "incomplete" : "complete",
  },
];

export function BrainDashboard({ 
  onNavigateToSection,
  onStartInterview,
}: BrainDashboardProps) {
  const navigate = useNavigate();
  const { businessMode } = useTenantConfig();
  const summaries = useBrainSummaries();
  const theme = getModeTheme(businessMode);

  const { completedCount, totalCount, percentage, isReady } = useMemo(() => {
    const essentialCategories = CATEGORIES.filter(c => c.isEssential);
    const completed = essentialCategories.filter(c => c.getStatus(summaries) === "complete").length;
    const total = essentialCategories.length;
    const pct = Math.round((completed / total) * 100);
    return {
      completedCount: completed,
      totalCount: total,
      percentage: pct,
      isReady: pct >= 100,
    };
  }, [summaries]);

  // Dynamic title based on mode
  const getOfferingsTitle = () => {
    switch (businessMode) {
      case "food": return "Menu & Pricing";
      case "dispatch": return "Services & Rates";
      default: return "Services & Pricing";
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${theme.accent}15` }}
          >
            <Brain className="h-6 w-6" style={{ color: theme.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Business Brain</h1>
            <p className="text-sm text-muted-foreground">
              Everything your AI knows about your {getModeDisplayName(businessMode).toLowerCase()} business
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl p-4 border",
            isReady 
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isReady ? (
                <>
                  <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-900 dark:text-green-100">
                    Your AI is ready!
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    {totalCount - completedCount} thing{totalCount - completedCount !== 1 ? "s" : ""} to complete
                  </span>
                </>
              )}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{totalCount} essentials
            </span>
          </div>
          <Progress 
            value={percentage} 
            className={cn(
              "h-2",
              isReady ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"
            )}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/simulator")}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              Test Your AI
            </Button>
            {onStartInterview && !isReady && (
              <Button
                size="sm"
                onClick={onStartInterview}
                className="flex-1"
                style={{ backgroundColor: theme.accent }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Guided Setup
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Category Cards */}
      <div className="space-y-3">
        {CATEGORIES.map((category, index) => {
          const title = category.id === "offerings" ? getOfferingsTitle() : category.title;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CategoryCard
                id={category.id}
                title={title}
                icon={category.icon}
                status={category.getStatus(summaries)}
                summary={category.getSummary(summaries)}
                mode={businessMode}
                onEdit={onNavigateToSection}
                sectionId={category.sectionId}
                isEssential={category.isEssential}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Improve Setup CTA */}
      {onStartInterview && isReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Button
            variant="outline"
            onClick={onStartInterview}
            className="text-muted-foreground"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Improve Your Setup
          </Button>
        </motion.div>
      )}
    </div>
  );
}
