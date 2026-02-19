import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Pin, PinOff, Trash2, Copy, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMarketingSavedContent,
  useTogglePinContent,
  useDeleteMarketingContent,
} from "@/hooks/useMarketingChat";
import { toast } from "sonner";
import { format } from "date-fns";

export function SavedContentLibrary() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: content, isLoading } = useMarketingSavedContent(userId);
  const togglePin = useTogglePinContent(userId);
  const deleteContent = useDeleteMarketingContent(userId);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = (content ?? []).filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  // Sort: pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Content Library</h3>
          <p className="text-sm text-muted-foreground">
            Saved AI-generated marketing content. {sorted.length} items.
          </p>
        </div>
      </div>

      {sorted.length > 5 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No saved content yet.</p>
          <p className="text-xs mt-1">Use the Chat tab to generate marketing content, then save it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        <h4
                          className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          {item.title}
                        </h4>
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                          {item.content}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          navigator.clipboard.writeText(item.content);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => togglePin.mutate({ id: item.id, is_pinned: !item.is_pinned })}
                      >
                        {item.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteTarget(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this saved content.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteContent.mutate(deleteTarget); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
