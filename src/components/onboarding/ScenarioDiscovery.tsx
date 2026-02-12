import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Bot, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getQuestionsForMode,
  isPreAnswered,
  groupLabels,
  type ScenarioQuestion,
  type QuestionGroup,
} from "@/lib/scenarioQuestions";
import { getIndustryBySlug } from "@/data/industryCatalog";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface ScenarioDiscoveryProps {
  businessMode: BusinessMode;
  answers: Record<string, boolean>;
  onChange: (answers: Record<string, boolean>) => void;
  industrySlug?: string;
  industryCategory?: string;
}

export function ScenarioDiscovery({
  businessMode,
  answers,
  onChange,
  industrySlug,
  industryCategory,
}: ScenarioDiscoveryProps) {
  const industryContext = industrySlug && industryCategory
    ? { slug: industrySlug, category: industryCategory }
    : undefined;

  const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : null;
  const industryLabel = industryEntry?.name?.toLowerCase();

  const questions = getQuestionsForMode(businessMode, industryContext);

  // Filter by showWhen condition
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.showWhen) return true;
      return answers[q.showWhen.capabilityKey] === q.showWhen.value;
    });
  }, [questions, answers]);

  // Group questions
  const grouped = useMemo(() => {
    const groups: { group: QuestionGroup; questions: ScenarioQuestion[] }[] = [];
    const byGroup = new Map<QuestionGroup, ScenarioQuestion[]>();

    for (const q of visibleQuestions) {
      const g = q.group || "core";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(q);
    }

    // Preserve order: core → ai_behavior → advanced
    const order: QuestionGroup[] = ["core", "ai_behavior", "advanced"];
    for (const g of order) {
      const qs = byGroup.get(g);
      if (qs && qs.length > 0) {
        groups.push({ group: g, questions: qs });
      }
    }

    return groups;
  }, [visibleQuestions]);

  const toggle = (capabilityKey: string, blocking?: boolean) => {
    if (blocking) return; // Blocking questions cannot be toggled off
    onChange({
      ...answers,
      [capabilityKey]: !answers[capabilityKey],
    });
  };

  let globalIndex = 0;

  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track scroll to hide the "more below" indicator
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;
    const handleScroll = () => {
      if ((viewport as HTMLElement).scrollTop > 40) setHasScrolled(true);
    };
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How does your {industryLabel || "business"} operate?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell us about your operations so we can configure the right capabilities.
        </p>
      </div>

      <div className="relative">
        <ScrollArea className="h-[460px]" ref={scrollRef}>
          <div className="space-y-5 pr-4">
            {grouped.map(({ group, questions: groupQuestions }) => (
              <div key={group} className="space-y-3">
                {grouped.length > 1 && (
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">
                    {groupLabels[group]}
                  </p>
                )}
                {groupQuestions.map((q) => {
                  const index = globalIndex++;
                  return (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      checked={answers[q.capabilityKey] ?? q.defaultValue}
                      onToggle={() => toggle(q.capabilityKey, q.blocking)}
                      index={index}
                      isPreSet={isPreAnswered(q, industryContext)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Scroll indicator */}
        {!hasScrolled && visibleQuestions.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="h-16 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                Scroll for more
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  checked,
  onToggle,
  index,
  isPreSet,
}: {
  question: ScenarioQuestion;
  checked: boolean;
  onToggle: () => void;
  index: number;
  isPreSet?: boolean;
}) {
  const isBlocking = question.blocking;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "transition-all",
          isBlocking && "border-amber-500/50 bg-amber-500/5",
          !isBlocking && checked && "border-primary/50 bg-primary/5"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {isBlocking && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-amber-500/20">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{question.question}</h4>
                {isPreSet && checked && (
                  <Badge variant="outline" className="text-[10px] gap-1 shrink-0 border-primary/40 text-primary">
                    Pre-set for your industry
                  </Badge>
                )}
                {question.requiredForAI && (
                  <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                    <Bot className="h-3 w-3" />
                    AI uses this
                  </Badge>
                )}
              </div>
              {question.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {question.description}
                </p>
              )}
            </div>

            <Switch
              checked={checked}
              onCheckedChange={onToggle}
              disabled={isBlocking}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
