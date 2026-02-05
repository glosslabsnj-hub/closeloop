import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Note {
  text: string;
  created_at: string;
  created_by: string;
}

interface NotesSectionProps {
  campaignId: string;
  existingNotes: string | null;
  onNotesUpdated?: () => void;
}

function parseNotes(notesJson: string | null): Note[] {
  if (!notesJson) return [];
  try {
    const parsed = JSON.parse(notesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Legacy: single string note
    if (notesJson.trim()) {
      return [{ text: notesJson, created_at: new Date().toISOString(), created_by: "System" }];
    }
    return [];
  }
}

export function NotesSection({ campaignId, existingNotes, onNotesUpdated }: NotesSectionProps) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Note[]>(() => parseNotes(existingNotes));
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!note.trim()) return;

    const newNote: Note = {
      text: note.trim(),
      created_at: new Date().toISOString(),
      created_by: "You",
    };

    setSaving(true);
    try {
      const updatedNotes = [...notes, newNote];
      
      const { error } = await supabase
        .from("lead_recovery_campaigns")
        .update({ notes: JSON.stringify(updatedNotes) })
        .eq("id", campaignId);

      if (error) throw error;

      setNotes(updatedNotes);
      setNote("");
      onNotesUpdated?.();
      toast.success("Note added");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note input */}
      <div className="space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a note about this lead..."
          rows={2}
          className="resize-none"
        />
        <Button 
          size="sm" 
          onClick={handleAdd} 
          disabled={!note.trim() || saving}
          className="gap-1"
        >
          <Plus className="w-3 h-3" />
          {saving ? "Adding..." : "Add Note"}
        </Button>
      </div>

      {/* Previous notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Previous notes:</p>
          <div className="space-y-2">
            {notes.slice().reverse().map((n, i) => (
              <div key={i} className="text-sm pl-3 border-l-2 border-border">
                <span className="text-muted-foreground">
                  {format(new Date(n.created_at), "MMM d")}:
                </span>{" "}
                "{n.text}" <span className="text-muted-foreground">- {n.created_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
