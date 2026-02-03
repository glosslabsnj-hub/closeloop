import { useAdminMode } from "@/contexts/AdminModeContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope, 
  MessageSquare,
  Loader2
} from "lucide-react";
import type { BusinessMode } from "@/types/database";

const MODES: { value: BusinessMode; label: string; icon: React.ElementType }[] = [
  { value: "service", label: "Service", icon: Wrench },
  { value: "dispatch", label: "Dispatch", icon: Truck },
  { value: "food", label: "Food", icon: UtensilsCrossed },
  { value: "medical", label: "Medical", icon: Stethoscope },
  { value: "general", label: "General", icon: MessageSquare },
];

export function AdminModeSelector() {
  const adminModeContext = useAdminMode();

  // If context not available, don't render
  if (!adminModeContext) return null;

  const { selectedMode, setSelectedMode, isLoading } = adminModeContext;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Tabs 
      value={selectedMode} 
      onValueChange={(value) => setSelectedMode(value as BusinessMode)}
      className="w-auto"
    >
      <TabsList className="h-9 bg-sidebar-accent/50">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <TabsTrigger
              key={mode.value}
              value={mode.value}
              className="gap-1.5 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
