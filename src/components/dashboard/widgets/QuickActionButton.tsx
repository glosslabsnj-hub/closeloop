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
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm card-interactive cursor-pointer text-left w-full border border-border/30 group"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/10 group-hover:shadow-[0_0_12px_-3px_hsl(230_70%_62%/0.2)] transition-all shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}
