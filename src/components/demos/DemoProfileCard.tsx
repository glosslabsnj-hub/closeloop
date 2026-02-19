import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Trash2, Radio, MapPin, Phone } from "lucide-react";
import type { DemoProfile } from "@/hooks/useDemoProfiles";

interface DemoProfileCardProps {
  profile: DemoProfile;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  isActivating: boolean;
  isDeleting: boolean;
}

export function DemoProfileCard({
  profile,
  onActivate,
  onDelete,
  isActivating,
  isDeleting,
}: DemoProfileCardProps) {
  return (
    <Card className={profile.is_active ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{profile.business_name}</h3>
              {profile.is_active && (
                <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0">
                  <Radio className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">{profile.business_mode}</Badge>
              <Badge variant="outline" className="text-xs">{profile.industry}</Badge>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {!profile.is_active && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(profile.id)}
                disabled={isActivating}
              >
                Activate
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(profile.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {profile.website_url}
          </span>
          {profile.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.address}
            </span>
          )}
          {profile.phone_extracted && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {profile.phone_extracted}
            </span>
          )}
        </div>

        {profile.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{profile.description}</p>
        )}

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{(profile.services_json as unknown[])?.length || 0} services</span>
          <span>{(profile.faqs_json as unknown[])?.length || 0} FAQs</span>
        </div>
      </CardContent>
    </Card>
  );
}
