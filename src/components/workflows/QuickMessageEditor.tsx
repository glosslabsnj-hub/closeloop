import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VariablePicker } from "./VariablePicker";
import { Pencil, Check, X } from "lucide-react";

interface QuickMessageEditorProps {
  message: string;
  onSave: (message: string) => void;
  variables: string[];
  isLoading?: boolean;
}

export function QuickMessageEditor({
  message,
  onSave,
  variables,
  isLoading = false,
}: QuickMessageEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);

  const handleOpen = () => {
    setEditedMessage(message);
    setIsOpen(true);
  };

  const handleSave = () => {
    onSave(editedMessage);
    setIsOpen(false);
  };

  const handleInsertVariable = (variable: string) => {
    setEditedMessage((prev) => prev + `{{${variable}}}`);
  };

  // Character count for SMS (160 chars per segment)
  const charCount = editedMessage.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3 mr-1" />
        Edit message
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit SMS Message</DialogTitle>
            <DialogDescription>
              Customize the message sent to customers. Use variables to personalize.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message</Label>
                <VariablePicker
                  variables={variables}
                  onSelect={handleInsertVariable}
                />
              </div>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={4}
                placeholder="Enter your message..."
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {charCount} characters ({segments} SMS segment{segments !== 1 ? "s" : ""})
                </span>
                {charCount > 320 && (
                  <span className="text-amber-500">Long message may incur extra costs</span>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">Available Variables:</p>
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <code
                    key={v}
                    className="px-1.5 py-0.5 text-xs bg-background rounded border cursor-pointer hover:border-primary"
                    onClick={() => handleInsertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Check className="h-4 w-4 mr-1" />
              Save Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
