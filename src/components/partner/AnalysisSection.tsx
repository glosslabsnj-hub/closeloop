import { cn } from "@/lib/utils";

interface AnalysisSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AnalysisSection({
  title,
  description,
  children,
  className,
}: AnalysisSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
