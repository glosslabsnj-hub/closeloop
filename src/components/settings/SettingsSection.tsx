import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  id?: string;
}

export function SettingsSection({ title, description, children, id }: SettingsSectionProps) {
  return (
    <div className="space-y-8" id={id}>
      {/* Section Header with accent border */}
      <div className="relative pb-6 mb-2">
        <div className="flex items-start gap-4">
          <div className="w-1 h-12 rounded-full bg-primary shrink-0" />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">{description}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
