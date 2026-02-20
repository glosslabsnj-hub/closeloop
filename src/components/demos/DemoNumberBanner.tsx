import { Card, CardContent } from "@/components/ui/card";
import { Phone, Radio } from "lucide-react";
import type { DemoPhoneNumber, DemoProfile } from "@/hooks/useDemoProfiles";

interface DemoNumberBannerProps {
  demoPhone: DemoPhoneNumber | null;
  activeProfile: DemoProfile | undefined;
}

export function DemoNumberBanner({ demoPhone, activeProfile }: DemoNumberBannerProps) {
  if (!demoPhone) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No demo phone number assigned yet. Create your first demo profile to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Demo Number</p>
            <p className="text-lg font-bold tracking-wide">{demoPhone.phone_e164}</p>
          </div>
        </div>
        <div className="text-right">
          {activeProfile ? (
            <div className="flex items-center gap-2 text-sm">
              <Radio className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">
                Active: <span className="text-foreground font-medium">{activeProfile.business_name}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active demo</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
