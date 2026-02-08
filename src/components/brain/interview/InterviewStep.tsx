/**
 * InterviewStep - Renders a single step with its questions
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, Sparkles, Clock } from "lucide-react";
import type { InterviewQuestion } from "./interviewQuestions";
import type { InterviewAnswers } from "@/hooks/useInterviewState";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00", "23:30", "00:00",
];

interface DayHours {
  isOpen: boolean;
  start: string;
  end: string;
}

interface HoursGridValue {
  [dayIndex: string]: DayHours;
}

interface InterviewStepProps {
  questions: InterviewQuestion[];
  answers: InterviewAnswers;
  onAnswer: (questionId: string, value: string | boolean | number | string[]) => void;
}

export function InterviewStep({ questions, answers, onAnswer }: InterviewStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {questions.map((question, index) => (
        <QuestionRenderer
          key={question.id}
          question={question}
          value={answers[question.id]}
          onChange={(value) => onAnswer(question.id, value)}
          isFirst={index === 0}
        />
      ))}
    </motion.div>
  );
}

interface QuestionRendererProps {
  question: InterviewQuestion;
  value: string | boolean | number | string[] | undefined;
  onChange: (value: string | boolean | number | string[]) => void;
  isFirst?: boolean;
}

function QuestionRenderer({ question, value, onChange, isFirst }: QuestionRendererProps) {
  const renderInput = () => {
    switch (question.type) {
      case "text":
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="max-w-md"
          />
        );

      case "textarea":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={3}
            className="max-w-lg"
          />
        );

      case "number":
        return (
          <div className="flex items-center gap-2 max-w-[180px]">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              value={(value as number) || ""}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              placeholder={question.placeholder}
            />
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={value as boolean || false}
              onCheckedChange={(checked) => onChange(checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? "Yes" : "No"}
            </span>
          </div>
        );

      case "hours-grid":
        // Parse value if it's already a HoursGridValue object, otherwise use default
        const hoursValue = (typeof value === 'object' && value !== null && !Array.isArray(value))
          ? (value as unknown as HoursGridValue)
          : getDefaultHoursGrid();
        return (
          <HoursGridInput
            value={hoursValue}
            onChange={(v) => onChange(v as unknown as string)}
          />
        );

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        — {opt.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi-select":
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {question.options?.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedValues.includes(opt.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Checkbox
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, opt.value]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== opt.value));
                    }
                  }}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-muted-foreground">
                      {opt.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case "scenario":
        return (
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
            className="space-y-2"
          >
            {question.options?.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  value === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={opt.value} className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {opt.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </RadioGroup>
        );

      case "time-range":
        return (
          <div className="flex items-center gap-2">
            <Select
              value={(value as string)?.split("-")[0] || "09:00"}
              onValueChange={(v) => {
                const end = (value as string)?.split("-")[1] || "17:00";
                onChange(`${v}-${end}`);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">to</span>
            <Select
              value={(value as string)?.split("-")[1] || "17:00"}
              onValueChange={(v) => {
                const start = (value as string)?.split("-")[0] || "09:00";
                onChange(`${start}-${v}`);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-3", isFirst && "pt-0")}>
      <div className="space-y-1">
        <Label className="text-base font-medium flex items-center gap-2">
          {question.question}
          {question.required && <span className="text-destructive">*</span>}
        </Label>
        {question.helpText && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            {question.helpText}
          </p>
        )}
      </div>

      {renderInput()}

      {/* AI Preview */}
      {question.aiPreviewTemplate && value && (
        <AIPreviewBubble
          template={question.aiPreviewTemplate}
          value={value}
        />
      )}
    </div>
  );
}

interface AIPreviewBubbleProps {
  template: string;
  value: string | boolean | number | string[];
}

function AIPreviewBubble({ template, value }: AIPreviewBubbleProps) {
  // Simple template replacement
  let preview = template;
  
  if (typeof value === "string") {
    preview = template.replace("{value}", value);
  } else if (typeof value === "number") {
    preview = template.replace("{value}", value.toString());
  } else if (typeof value === "boolean") {
    preview = template.replace("{value}", value ? "Yes" : "No");
  }

  // Handle conditional expressions like {value === 'exact' ? 'text1' : 'text2'}
  // This is a simplified version - just show the template for now
  if (preview.includes("===")) {
    // Just show a generic preview for complex conditionals
    preview = "Your AI will explain this clearly to callers.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
    >
      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div>
        <div className="text-xs font-medium text-primary mb-1">
          Your AI will say:
        </div>
        <div className="text-sm text-foreground italic">
          "{preview}"
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to format 24h time to 12h display
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getDefaultHoursGrid(): HoursGridValue {
  const grid: HoursGridValue = {};
  DAYS_OF_WEEK.forEach((day) => {
    // Monday-Friday open 9-5, weekends closed by default
    grid[day.value.toString()] = {
      isOpen: day.value >= 1 && day.value <= 5,
      start: "09:00",
      end: "17:00",
    };
  });
  return grid;
}

interface HoursGridInputProps {
  value: HoursGridValue;
  onChange: (value: HoursGridValue) => void;
}

function HoursGridInput({ value, onChange }: HoursGridInputProps) {
  const updateDay = (dayIndex: number, updates: Partial<DayHours>) => {
    const key = dayIndex.toString();
    onChange({
      ...value,
      [key]: {
        ...value[key],
        ...updates,
      },
    });
  };

  const applyToAll = (dayIndex: number) => {
    const source = value[dayIndex.toString()];
    const newGrid: HoursGridValue = {};
    DAYS_OF_WEEK.forEach((day) => {
      newGrid[day.value.toString()] = { ...source };
    });
    onChange(newGrid);
  };

  return (
    <div className="space-y-3">
      {DAYS_OF_WEEK.map((day) => {
        const dayData = value[day.value.toString()] || { isOpen: false, start: "09:00", end: "17:00" };
        
        return (
          <div
            key={day.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              dayData.isOpen 
                ? "border-primary/30 bg-primary/5" 
                : "border-border bg-muted/30"
            )}
          >
            {/* Day name and toggle */}
            <div className="flex items-center gap-2 w-24 shrink-0">
              <Switch
                checked={dayData.isOpen}
                onCheckedChange={(isOpen) => updateDay(day.value, { isOpen })}
              />
              <span className={cn(
                "font-medium text-sm",
                !dayData.isOpen && "text-muted-foreground"
              )}>
                {day.short}
              </span>
            </div>

            {/* Time selectors */}
            {dayData.isOpen ? (
              <div className="flex items-center gap-2 flex-1">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={dayData.start}
                  onValueChange={(start) => updateDay(day.value, { start })}
                >
                  <SelectTrigger className="w-[100px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-sm">to</span>
                <Select
                  value={dayData.end}
                  onValueChange={(end) => updateDay(day.value, { end })}
                >
                  <SelectTrigger className="w-[100px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => applyToAll(day.value)}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Apply to all
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
