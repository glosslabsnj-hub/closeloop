import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ShieldQuestion } from "lucide-react";

export interface ObjectionResponse {
  objection: string;
  response: string;
}

interface ObjectionEditorProps {
  objections: ObjectionResponse[];
  onChange: (objections: ObjectionResponse[]) => void;
}

export default function ObjectionEditor({ objections, onChange }: ObjectionEditorProps) {
  const updateObjection = (index: number, field: keyof ObjectionResponse, value: string) => {
    const updated = [...objections];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeObjection = (index: number) => {
    const updated = objections.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addObjection = () => {
    onChange([...objections, { objection: '', response: '' }]);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        How should the AI respond when customers push back? These responses help overcome hesitation and close more bookings.
      </p>
      
      {objections.map((obj, index) => (
        <div key={index} className="p-3 rounded-lg border bg-card space-y-3">
          <div className="flex items-start gap-2">
            <ShieldQuestion className="h-4 w-4 text-destructive mt-2.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Input
                value={obj.objection}
                onChange={(e) => updateObjection(index, 'objection', e.target.value)}
                placeholder="Customer says: That's too expensive"
                className="text-sm font-medium"
              />
              <Textarea
                value={obj.response}
                onChange={(e) => updateObjection(index, 'response', e.target.value)}
                placeholder="AI responds with..."
                rows={3}
                className="text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeObjection(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <Button
        variant="outline"
        onClick={addObjection}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Objection Handler
      </Button>
    </div>
  );
}
