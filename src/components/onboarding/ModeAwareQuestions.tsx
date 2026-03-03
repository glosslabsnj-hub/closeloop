/**
 * ModeAwareQuestions — Compact scenario toggle cards for onboarding Phase 1.
 *
 * Renders 3-5 mode-specific questions filtered by `onboardingVisible: true`.
 * Shows pre-answered questions already toggled on based on industry.
 * Inline follow-up fields when toggled on with followUp config.
 */
import React, { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getQuestionsForMode,
  groupLabels,
  type ScenarioQuestion,
  type QuestionGroup,
  type FollowUpField,
} from "@/lib/scenarioQuestions";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { getIndustryTerminology } from "@/data/industryTerminology";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface ModeAwareQuestionsProps {
  businessMode: BusinessMode;
  industrySlug: string;
  scenarioAnswers: Record<string, boolean>;
  onScenarioAnswersChange: (answers: Record<string, boolean>) => void;
  scenarioDetails: Record<string, string>;
  onScenarioDetailsChange: (details: Record<string, string>) => void;
}

export const ModeAwareQuestions = React.memo(function ModeAwareQuestions({
  businessMode,
  industrySlug,
  scenarioAnswers,
  onScenarioAnswersChange,
  scenarioDetails,
  onScenarioDetailsChange,
}: ModeAwareQuestionsProps) {
  const [expanded, setExpanded] = useState(true);

  const industryEntry = getIndustryBySlug(industrySlug);
  const industryContext = industryEntry
    ? { slug: industrySlug, category: industryEntry.category }
    : undefined;

  // Resolve industry-specific appointment label for dynamic question text
  const terminology = useMemo(() =>
    getIndustryTerminology(businessMode, industryContext?.category, industryContext?.slug),
    [businessMode, industryContext?.category, industryContext?.slug]
  );
  const apptLabel = terminology.appointmentLabel;
  const apptLabelCap = apptLabel.charAt(0).toUpperCase() + apptLabel.slice(1);
  const apptLabelPlural = apptLabelCap + "s";

  // Replace "Appointments" / "appointments" in labels/descriptions with industry term
  const localizeLabel = (text: string) =>
    text.replace(/Appointments/g, apptLabelPlural).replace(/appointments/g, apptLabel + "s")
        .replace(/Appointment/g, apptLabelCap).replace(/appointment/g, apptLabel);

  // Get only onboarding-visible questions for this mode/industry
  const questions = useMemo(() => {
    const all = getQuestionsForMode(businessMode, industryContext);
    return all.filter((q) => q.onboardingVisible);
  }, [businessMode, industryContext?.slug, industryContext?.category]);

  // Group questions
  const grouped = useMemo(() => {
    const groups: Record<string, ScenarioQuestion[]> = {};
    for (const q of questions) {
      const group = q.group || "core";
      if (!groups[group]) groups[group] = [];
      groups[group].push(q);
    }
    return groups;
  }, [questions]);

  if (questions.length === 0) return null;

  const handleToggle = (capabilityKey: string, value: boolean) => {
    onScenarioAnswersChange({ ...scenarioAnswers, [capabilityKey]: value });
  };

  const handleDetailChange = (key: string, value: string) => {
    onScenarioDetailsChange({ ...scenarioDetails, [key]: value });
  };

  return (
    <div className="pt-4 border-t space-y-3">
      <button
        type="button"
        className="flex items-center justify-between w-full"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Quick questions about your business</p>
          <Badge variant="secondary" className="text-xs">
            {questions.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, groupQuestions]) => (
            <div key={group} className="space-y-2">
              {Object.keys(grouped).length > 1 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {groupLabels[group as QuestionGroup] || group}
                </p>
              )}
              {groupQuestions.map((q) => {
                const isOn = scenarioAnswers[q.capabilityKey] ?? q.defaultValue;
                const hasFollowUp = isOn && q.followUp;

                // Check conditional visibility — respect parent defaultValue
                if (q.showWhen) {
                  const parentQuestion = questions.find((pq) => pq.capabilityKey === q.showWhen!.capabilityKey);
                  const parentVal = scenarioAnswers[q.showWhen.capabilityKey] ?? parentQuestion?.defaultValue;
                  if (parentVal !== q.showWhen.value) return null;
                }

                return (
                  <Card
                    key={q.id}
                    className={cn(
                      "transition-all",
                      isOn ? "border-primary/30 bg-primary/5" : ""
                    )}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{localizeLabel(q.label)}</p>
                            {q.requiredForAI && (
                              <Sparkles className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </div>
                          {q.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{localizeLabel(q.description)}</p>
                          )}
                        </div>
                        <Switch
                          checked={isOn}
                          onCheckedChange={(checked) => handleToggle(q.capabilityKey, checked)}
                        />
                      </div>

                      {/* Inline follow-up fields */}
                      {hasFollowUp && q.followUp && "fields" in q.followUp && (
                        <div className="pl-1 pt-1 space-y-2">
                          {(q.followUp as { fields: FollowUpField[] }).fields.map((field) => (
                            <div key={field.key} className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap min-w-[100px]">
                                {field.label}
                              </Label>
                              {field.type === "select" && field.options ? (
                                <select
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs w-full"
                                  value={scenarioDetails[field.key] || field.defaultValue || ""}
                                  onChange={(e) => handleDetailChange(field.key, e.target.value)}
                                >
                                  {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  className="h-8 text-xs"
                                  type={field.type === "currency" || field.type === "number" || field.type === "miles" ? "number" : "text"}
                                  placeholder={field.placeholder}
                                  value={scenarioDetails[field.key] || ""}
                                  onChange={(e) => handleDetailChange(field.key, e.target.value)}
                                />
                              )}
                              {field.suffix && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{field.suffix}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Radio follow-up */}
                      {hasFollowUp && q.followUp && "type" in q.followUp && q.followUp.type === "radio" && (
                        <div className="pl-1 pt-1 space-y-1.5">
                          <p className="text-xs font-medium">{q.followUp.label}</p>
                          {q.followUp.options.map((opt) => (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-md cursor-pointer text-xs border transition-all",
                                scenarioDetails[(q.followUp as any)!.answerKey || ""] === opt.value ||
                                  (!scenarioDetails[(q.followUp as any)!.answerKey || ""] && (q.followUp as any)!.defaultValue === opt.value)
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent hover:bg-muted/50"
                              )}
                            >
                              <input
                                type="radio"
                                name={(q.followUp as any)!.id}
                                value={opt.value}
                                checked={
                                  scenarioDetails[(q.followUp as any)!.answerKey || ""] === opt.value ||
                                  (!scenarioDetails[(q.followUp as any)!.answerKey || ""] && (q.followUp as any)!.defaultValue === opt.value)
                                }
                                onChange={() =>
                                  handleDetailChange((q.followUp as any)!.answerKey || (q.followUp as any)!.id, opt.value)
                                }
                                className="mt-0.5"
                              />
                              <div>
                                <p className="font-medium">{opt.label}</p>
                                {opt.description && (
                                  <p className="text-muted-foreground">{opt.description}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
