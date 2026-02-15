import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Bot, ChevronDown, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getQuestionsForMode,
  isPreAnswered,
  groupLabels,
  type ScenarioQuestion,
  type QuestionGroup,
  type FollowUpField,
  type ScenarioFollowUp,
} from "@/lib/scenarioQuestions";
import { getIndustryBySlug } from "@/data/industryCatalog";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface ScenarioDiscoveryProps {
  businessMode: BusinessMode;
  answers: Record<string, boolean>;
  onChange: (answers: Record<string, boolean>) => void;
  /** Follow-up detail values (non-boolean) keyed by FollowUpField.key */
  details?: Record<string, string>;
  onDetailsChange?: (details: Record<string, string>) => void;
  industrySlug?: string;
  industryCategory?: string;
}

export function ScenarioDiscovery({
  businessMode,
  answers,
  onChange,
  details = {},
  onDetailsChange,
  industrySlug,
  industryCategory,
}: ScenarioDiscoveryProps) {
  const industryContext = industrySlug && industryCategory
    ? { slug: industrySlug, category: industryCategory }
    : undefined;

  const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : null;
  const industryLabel = industryEntry?.name?.toLowerCase();

  const questions = getQuestionsForMode(businessMode, industryContext);

  // Filter to onboarding-visible questions only, plus showWhen condition
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Only show questions marked for onboarding (or blocking questions like HIPAA)
      if (!q.onboardingVisible && !q.blocking) return false;
      // Apply conditional visibility
      if (q.showWhen) {
        return answers[q.showWhen.capabilityKey] === q.showWhen.value;
      }
      return true;
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

  const updateDetail = (key: string, value: string) => {
    onDetailsChange?.({ ...details, [key]: value });
  };

  const handleFollowUpChange = (key: string, value: string) => {
    onChange({
      ...answers,
      [key]: value as any,
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
        <ScrollArea className="h-[380px]" ref={scrollRef}>
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
                      details={details}
                      onDetailChange={updateDetail}
                      answers={answers as Record<string, boolean | string>}
                      onAnswerChange={handleFollowUpChange}
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

function FollowUpFields({
  fields,
  details,
  onDetailChange,
}: {
  fields: FollowUpField[];
  details: Record<string, string>;
  onDetailChange: (key: string, value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3">
        {fields.map((field) => (
          <div key={field.key} className="flex-1 min-w-[140px] max-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {field.label}
            </label>
            {field.type === "select" ? (
              <Select
                value={details[field.key] || field.defaultValue || ""}
                onValueChange={(v) => onDetailChange(field.key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                {(field.type === "currency") && (
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                )}
                <Input
                  type={field.type === "number" || field.type === "currency" || field.type === "miles" ? "number" : "text"}
                  value={details[field.key] || ""}
                  onChange={(e) => onDetailChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={cn("h-8 text-xs", field.type === "currency" && "pl-6")}
                />
                {field.type === "miles" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mi</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuestionCard({
  question,
  checked,
  onToggle,
  index,
  isPreSet,
  details = {},
  onDetailChange,
  answers,
  onAnswerChange,
}: {
  question: ScenarioQuestion;
  checked: boolean;
  onToggle: () => void;
  index: number;
  isPreSet?: boolean;
  details?: Record<string, string>;
  onDetailChange?: (key: string, value: string) => void;
  answers: Record<string, boolean | string>;
  onAnswerChange: (key: string, value: string) => void;
}) {
  const isBlocking = question.blocking;
  const showFollowUp = checked && question.followUp;
  // Determine which type of follow-up this is
  const isFieldsFollowUp = showFollowUp && "fields" in question.followUp!;
  const isRadioFollowUp = showFollowUp && "answerKey" in question.followUp!;

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
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Inline follow-up fields (input-based) */}
          <AnimatePresence>
            {isFieldsFollowUp && onDetailChange && (
              <FollowUpFields
                fields={(question.followUp as { fields: FollowUpField[] }).fields}
                details={details}
                onDetailChange={onDetailChange}
              />
            )}
          </AnimatePresence>

          {/* Inline follow-up question (radio/select-based) */}
          <AnimatePresence>
            {isRadioFollowUp && question.followUp && "answerKey" in question.followUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <FollowUpSection
                  followUp={question.followUp as ScenarioFollowUp}
                  value={(answers[(question.followUp as ScenarioFollowUp).answerKey] as string) || (question.followUp as ScenarioFollowUp).defaultValue}
                  onChange={(val) => onAnswerChange((question.followUp as ScenarioFollowUp).answerKey, val)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FollowUpSection({
  followUp,
  value,
  onChange,
}: {
  followUp: ScenarioFollowUp;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-sm font-medium mb-2">{followUp.label}</p>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-1.5">
        {followUp.options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-all text-sm",
              value === opt.value
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/50 border border-transparent"
            )}
          >
            <RadioGroupItem value={opt.value} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{opt.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
