import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Variable } from "lucide-react";

interface VariablePickerProps {
  variables: string[];
  onSelect: (variable: string) => void;
}

export function VariablePicker({ variables, onSelect }: VariablePickerProps) {
  if (variables.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          <Variable className="h-3 w-3 mr-1" />
          Insert
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <ScrollArea className="h-48">
          <div className="p-2 space-y-1">
            {variables.map((v) => (
              <button
                key={v}
                className="w-full px-2 py-1.5 text-left text-sm rounded hover:bg-muted transition-colors font-mono"
                onClick={() => onSelect(v)}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
