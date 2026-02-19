import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useUpdateSocialPost, type AdminSocialPost } from "@/hooks/useAdminSocialPosts";

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

interface SocialPostEditorProps {
  post: AdminSocialPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialPostEditor({ post, open, onOpenChange }: SocialPostEditorProps) {
  const updatePost = useUpdateSocialPost();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduledFor, setScheduledFor] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setStatus(post.status);
      setScheduledFor(post.scheduled_for ? new Date(post.scheduled_for).toISOString().slice(0, 16) : "");
      setHashtagInput((post.hashtags || []).join(" "));
    }
  }, [post]);

  if (!post) return null;

  const handleSave = () => {
    updatePost.mutate(
      {
        id: post.id,
        content,
        status,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : post.scheduled_for,
        hashtags: hashtagInput.split(/\s+/).filter(Boolean).map((h) => h.startsWith("#") ? h : `#${h}`),
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Post
            <Badge variant="outline" className="text-xs capitalize">
              {PLATFORM_LABELS[post.platform] || post.platform}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[120px] text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{content.length} characters</p>
          </div>
          <div>
            <Label className="text-xs">Hashtags (space-separated)</Label>
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              className="mt-1 text-sm"
              placeholder="#AI #phonereceptionist"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Scheduled For</Label>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updatePost.isPending}>
            {updatePost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
