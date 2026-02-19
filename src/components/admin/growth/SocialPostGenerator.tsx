import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { useGenerateSocialBatch } from "@/hooks/useAdminSocialPosts";
import { useAdminGrowthSettings } from "@/hooks/useAdminGrowthSettings";

export function SocialPostGenerator() {
  const { data: settings } = useAdminGrowthSettings();
  const generateBatch = useGenerateSocialBatch();

  const handleGenerate = () => {
    generateBatch.mutate({
      platforms: settings?.social_platforms,
      posts_per_week: settings?.social_posts_per_week,
      tone: settings?.social_tone,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Social Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Generate a week of platform-specific social content using AI. Posts will be scheduled
          across the week based on your settings ({settings?.social_posts_per_week ?? 5} posts/week,{" "}
          {(settings?.social_platforms ?? []).join(", ") || "no platforms selected"}).
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generateBatch.isPending}
          className="w-full"
        >
          {generateBatch.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate This Week</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
