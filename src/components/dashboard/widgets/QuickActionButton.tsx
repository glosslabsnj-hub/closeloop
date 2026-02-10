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
      className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors cursor-pointer text-left w-full"
    >
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
