import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card
      interactive
      onClick={() => navigate(href)}
      className="cursor-pointer h-full"
    >
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="mt-3 w-fit gap-1 px-0 text-primary hover:text-primary/80">
          Open
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
