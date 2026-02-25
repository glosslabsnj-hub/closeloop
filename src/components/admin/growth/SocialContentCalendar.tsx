import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { useAdminSocialPosts, useDeleteSocialPost, type AdminSocialPost } from "@/hooks/useAdminSocialPosts";
import { SocialPostEditor } from "./SocialPostEditor";
import { SocialPostGenerator } from "./SocialPostGenerator";

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  twitter: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  facebook: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  instagram: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  tiktok: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-700",
  scheduled: "bg-blue-500/10 text-blue-700",
  posted: "bg-green-500/10 text-green-700",
  failed: "bg-red-500/10 text-red-700",
};

export function SocialContentCalendar() {
  const { data: posts, isLoading } = useAdminSocialPosts();
  const deletePost = useDeleteSocialPost();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editPost, setEditPost] = useState<AdminSocialPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSocialPost | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const postsByDay = useMemo(() => {
    const map: Record<string, AdminSocialPost[]> = {};
    (posts ?? []).forEach((post) => {
      const day = format(new Date(post.scheduled_for), "yyyy-MM-dd");
      if (!map[day]) map[day] = [];
      map[day].push(post);
    });
    return map;
  }, [posts]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <SocialPostGenerator />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Content Calendar</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDay[dayKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dayKey}
              className={`min-h-[120px] border rounded-lg p-1.5 ${isToday ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                {format(day, "EEE")}
                <span className={`ml-1 ${isToday ? "text-primary font-bold" : ""}`}>
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative bg-muted/50 rounded p-1 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setEditPost(post)}
                  >
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${PLATFORM_COLORS[post.platform] || ""}`}>
                        {PLATFORM_LABELS[post.platform]?.slice(0, 2) || post.platform.slice(0, 2)}
                      </Badge>
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${STATUS_COLORS[post.status] || ""}`}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{post.content}</p>
                    <button
                      className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(post); }}
                    >
                      <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(!posts || posts.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No social posts scheduled. Click "Generate This Week" to create content.
        </p>
      )}

      <SocialPostEditor post={editPost} open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>Delete this {deleteTarget?.platform} post?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deletePost.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
