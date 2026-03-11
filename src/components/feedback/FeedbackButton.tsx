import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Category = "problem" | "feature" | "rating";

const PROBLEM_SUBCATEGORIES = [
  "Calls",
  "Bookings",
  "Notifications",
  "Integrations",
  "Setup",
  "Other",
] as const;

const CATEGORY_LABELS: Record<Category, string> = {
  problem: "Report a Problem",
  feature: "Suggest a Feature",
  rating: "Rate Your Experience",
};

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | "">("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { user, effectiveTenantId } = useAuth();
  const location = useLocation();

  const resetForm = () => {
    setCategory("");
    setSubcategory("");
    setDescription("");
    setSubmitted(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset after close animation completes
      setTimeout(resetForm, 200);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("feedback")
        .insert({
          tenant_id: effectiveTenantId,
          user_email: user?.email ?? null,
          category,
          subcategory: category === "problem" ? subcategory || null : null,
          description: description.trim(),
          page_url: window.location.origin + location.pathname,
        });

      if (error) {
        console.error("Failed to submit feedback:", error);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = category && description.trim().length > 0 && !submitting;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Let us know how we can improve your experience.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Thank you! We'll review this within 24 hours.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fb-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v as Category);
                    if (v !== "problem") setSubcategory("");
                  }}
                >
                  <SelectTrigger id="fb-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {category === "problem" && (
                <div className="space-y-2">
                  <Label htmlFor="fb-subcategory">Area</Label>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger id="fb-subcategory">
                      <SelectValue placeholder="Select an area" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBLEM_SUBCATEGORIES.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fb-description">Description</Label>
                <Textarea
                  id="fb-description"
                  placeholder="Tell us more..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
