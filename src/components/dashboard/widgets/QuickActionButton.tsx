import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface QuickActionButtonProps {
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
}

export function QuickActionButton({ label, description, href, icon: Icon }: QuickActionButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(href)}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors cursor-pointer text-left w-full border border-border/40"
    >
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
    </button>
  );
}
