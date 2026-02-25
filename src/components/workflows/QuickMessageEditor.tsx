import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Check, X, Eye, Variable, HelpCircle } from "lucide-react";
import { VARIABLE_INFO, CATEGORY_LABELS, type VariableCategory } from "@/data/workflowGuides";
import { useTenantConfig } from "@/hooks/useTenantConfig";

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
  const { _businessMode } = useTenantConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

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

  // Get variable info for the available variables
  const variableInfo = useMemo(() => {
    return variables
      .map((v) => VARIABLE_INFO[v])
      .filter(Boolean);
  }, [variables]);

  // Group variables by category
  const groupedVariables = useMemo(() => {
    const grouped: Record<VariableCategory, typeof variableInfo> = {
      customer: [],
      order: [],
      booking: [],
      dispatch: [],
      call: [],
      business: [],
    };

    for (const v of variableInfo) {
      grouped[v.category].push(v);
    }

    return grouped;
  }, [variableInfo]);

  // Generate preview with example values
  const previewMessage = useMemo(() => {
    let preview = editedMessage;
    for (const v of variableInfo) {
      preview = preview.replace(new RegExp(`{{${v.key}}}`, "g"), v.example);
    }
    return preview;
  }, [editedMessage, variableInfo]);

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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit SMS Message</DialogTitle>
            <DialogDescription>
              Customize the message sent to customers. Use variables to personalize.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter your message..."
                  className="resize-none font-mono text-sm"
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

              {/* Enhanced Variable Picker */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Variable className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Insert Variables</Label>
                  <span className="text-xs text-muted-foreground">(click to add)</span>
                </div>
                <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
                  <div className="space-y-4">
                    {Object.entries(groupedVariables).map(([category, vars]) => {
                      if (vars.length === 0) return null;
                      const categoryInfo = CATEGORY_LABELS[category as VariableCategory];
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{categoryInfo.icon}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {categoryInfo.label}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {vars.map((v) => (
                              <button
                                key={v.key}
                                onClick={() => handleInsertVariable(v.key)}
                                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-background transition-colors group border border-transparent hover:border-primary/30"
                              >
                                <div className="flex items-center justify-between">
                                  <code className="text-xs font-mono text-primary font-medium">
                                    {`{{${v.key}}}`}
                                  </code>
                                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    + Add
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {v.description} → <span className="font-medium">"{v.example}"</span>
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label>Message Preview</Label>
                </div>
                <div className="rounded-lg bg-muted p-4 min-h-[100px]">
                  <p className="text-sm whitespace-pre-wrap">
                    {previewMessage || <span className="text-muted-foreground italic">Your message will appear here...</span>}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Variables are replaced with example values in this preview
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
