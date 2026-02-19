import { useSavedLeads } from "@/hooks/useAgencyLeads";
import { useIsAgencyUser } from "@/hooks/useAgencyData";
import { SavedLeadsTab } from "@/components/agency/lead-finder/SavedLeadsTab";

export default function AgencySavedLeadsPage() {
  const { agencyId } = useIsAgencyUser();
  const savedLeads = useSavedLeads(agencyId);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saved Leads</h1>
        <p className="text-sm text-muted-foreground">Track and manage your prospecting pipeline.</p>
      </div>
      {agencyId && <SavedLeadsTab leads={savedLeads.data ?? []} agencyId={agencyId} />}
    </div>
  );
}
