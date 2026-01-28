import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, FileText, UtensilsCrossed, HelpCircle, Briefcase, ShieldAlert } from "lucide-react";
import { useKnowledgeSuggestions, type ExtractedKnowledgeSuggestion } from "@/hooks/useKnowledgeSuggestions";
import { toast } from "sonner";

const suggestionTypeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  service: { icon: Briefcase, label: "Service" },
  faq: { icon: HelpCircle, label: "FAQ" },
  menu_item: { icon: UtensilsCrossed, label: "Menu Item" },
  policy: { icon: ShieldAlert, label: "Policy" },
  objection: { icon: FileText, label: "Objection Response" },
};

function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  suggestion: ExtractedKnowledgeSuggestion;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const config = suggestionTypeConfig[suggestion.suggestion_type] || suggestionTypeConfig.service;
  const Icon = config.icon;
  const data = suggestion.extracted_data;

  const renderPreview = () => {
    switch (suggestion.suggestion_type) {
      case "service":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <strong>Name:</strong> {data.name}
            </p>
            {data.description && (
              <p className="text-muted-foreground line-clamp-2">{data.description}</p>
            )}
            {data.price_amount && (
              <p>
                <strong>Price:</strong> ${(data.price_amount / 100).toFixed(2)}
              </p>
            )}
            {data.duration_minutes && (
              <p>
                <strong>Duration:</strong> {data.duration_minutes} min
              </p>
            )}
          </div>
        );

      case "menu_item":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <strong>Name:</strong> {data.name}
            </p>
            {data.description && (
              <p className="text-muted-foreground line-clamp-2">{data.description}</p>
            )}
            {data.price_cents && (
              <p>
                <strong>Price:</strong> ${(data.price_cents / 100).toFixed(2)}
              </p>
            )}
            {data.category && (
              <p>
                <strong>Category:</strong> {data.category}
              </p>
            )}
          </div>
        );

      case "faq":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <strong>Q:</strong> {data.question}
            </p>
            <p className="text-muted-foreground line-clamp-3">
              <strong>A:</strong> {data.answer}
            </p>
          </div>
        );

      case "policy":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <strong>Title:</strong> {data.title}
            </p>
            <p className="text-muted-foreground line-clamp-3">{data.content}</p>
          </div>
        );

      case "objection":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <strong>Objection:</strong> {data.objection}
            </p>
            <p className="text-muted-foreground line-clamp-2">
              <strong>Response:</strong> {data.response}
            </p>
          </div>
        );

      default:
        return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.label}
          </CardTitle>
          <Badge variant="secondary">Pending Review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderPreview()}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SuggestionReviewList() {
  const { pendingSuggestions, isLoading, approve, reject, isApproving, isRejecting } =
    useKnowledgeSuggestions();

  const handleApprove = async (id: string) => {
    try {
      await approve(id);
      toast.success("Suggestion approved and added to your Business Brain");
    } catch (error) {
      toast.error("Failed to approve suggestion");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject(id);
      toast.success("Suggestion rejected");
    } catch (error) {
      toast.error("Failed to reject suggestion");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading suggestions...
        </CardContent>
      </Card>
    );
  }

  if (pendingSuggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No pending suggestions.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload documents to automatically extract knowledge for your AI.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Review these extracted items. Approved items will be added to your Business Brain.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pendingSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onApprove={() => handleApprove(suggestion.id)}
            onReject={() => handleReject(suggestion.id)}
            isApproving={isApproving}
            isRejecting={isRejecting}
          />
        ))}
      </div>
    </div>
  );
}
