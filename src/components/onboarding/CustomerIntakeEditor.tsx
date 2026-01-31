import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { ContextField } from "@/data/industryTemplates";

export interface IntakeQuestion {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required: boolean;
}

interface CustomerIntakeEditorProps {
  questions: IntakeQuestion[];
  onChange: (questions: IntakeQuestion[]) => void;
}

export default function CustomerIntakeEditor({ questions, onChange }: CustomerIntakeEditorProps) {
  const updateQuestion = (index: number, field: keyof IntakeQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addQuestion = () => {
    const newQuestion: IntakeQuestion = {
      key: `custom_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };
    onChange([...questions, newQuestion]);
  };

  const toggleRequired = (index: number) => {
    updateQuestion(index, 'required', !questions[index].required);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        What information does your team need to collect before a job? The AI will ask these questions during calls.
      </p>
      
      {questions.map((question, index) => (
        <div key={question.key} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0 cursor-grab" />
          
          <div className="flex-1 space-y-2">
            <Input
              value={question.label}
              onChange={(e) => updateQuestion(index, 'label', e.target.value)}
              placeholder="Question label (e.g., Vehicle Make)"
              className="text-sm"
            />
            
            {question.type === 'select' && question.options && (
              <Input
                value={question.options.join(', ')}
                onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Options (comma-separated)"
                className="text-xs"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Switch
                checked={question.required}
                onCheckedChange={() => toggleRequired(index)}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground">Required</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeQuestion(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
