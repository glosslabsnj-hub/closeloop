import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getQuestionsForMode, type ScenarioQuestion } from "@/lib/scenarioQuestions";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface ScenarioDiscoveryProps {
  businessMode: BusinessMode;
  answers: Record<string, boolean>;
  onChange: (answers: Record<string, boolean>) => void;
}

export function ScenarioDiscovery({ businessMode, answers, onChange }: ScenarioDiscoveryProps) {
  const questions = getQuestionsForMode(businessMode);

  const toggle = (capabilityKey: string, blocking?: boolean) => {
    if (blocking) return; // Blocking questions cannot be toggled off
    onChange({
      ...answers,
      [capabilityKey]: !answers[capabilityKey],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How does your business operate?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell us about your operations so we can configure the right capabilities.
        </p>
      </div>

      <ScrollArea className="h-[380px]">
        <div className="space-y-3 pr-4">
          {questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              checked={answers[q.capabilityKey] ?? q.defaultValue}
              onToggle={() => toggle(q.capabilityKey, q.blocking)}
              index={index}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function QuestionCard({
  question,
  checked,
  onToggle,
  index,
}: {
  question: ScenarioQuestion;
  checked: boolean;
  onToggle: () => void;
  index: number;
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
              <h4 className="font-medium">{question.question}</h4>
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
