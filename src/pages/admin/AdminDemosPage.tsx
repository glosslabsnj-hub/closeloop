import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDemoProfiles } from "@/hooks/useDemoProfiles";
import { DemoProfileCard } from "@/components/demos/DemoProfileCard";
import { CreateDemoDialog } from "@/components/demos/CreateDemoDialog";
import { DemoNumberBanner } from "@/components/demos/DemoNumberBanner";
import type { WebsiteExtractionResult } from "@/lib/mapWebsiteImportToOnboarding";

export default function AdminDemosPage() {
  const { profiles, demoPhone, loading, createProfile, activateProfile, deleteProfile } = useDemoProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.is_active);

  const handleConfirm = (result: WebsiteExtractionResult) => {
    createProfile.mutate(
      {
        business_name: result.business_name,
        industry: result.suggested_industry,
        business_mode: result.suggested_business_mode,
        website_url: "",
        address: result.address,
        phone_extracted: result.phone,
        hours_json: (result.hours as unknown as Record<string, unknown>) || {},
        services_json: result.services || [],
        faqs_json: result.faqs || [],
        description: result.description || "",
        owner_type: "admin",
      },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demo Accounts</h1>
          <p className="text-muted-foreground text-sm">
            Create demo business profiles from any website. Activate one to route your demo number.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Demo
        </Button>
      </div>

      <DemoNumberBanner demoPhone={demoPhone} activeProfile={activeProfile} />

      {profiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No demo profiles yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <DemoProfileCard
              key={profile.id}
              profile={profile}
              onActivate={(id) => activateProfile.mutate(id)}
              onDelete={(id) => deleteProfile.mutate(id)}
              isActivating={activateProfile.isPending}
              isDeleting={deleteProfile.isPending}
            />
          ))}
        </div>
      )}

      <CreateDemoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
        isCreating={createProfile.isPending}
      />
    </div>
  );
}
