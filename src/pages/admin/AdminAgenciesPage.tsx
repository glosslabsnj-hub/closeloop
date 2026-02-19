import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users2, DollarSign, Building2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useAdminAgencies, useAgencyClients } from "@/hooks/useAdminAgencyStats";
import { format } from "date-fns";

function AgencyExpandRow({ agency }: { agency: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: clients, isLoading } = useAgencyClients(expanded ? agency.id : null);

  return (
    <>
      <tr
        className="border-b hover:bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="py-3 font-medium">{agency.company_name || "Unnamed"}</td>
        <td className="py-3 text-muted-foreground hidden sm:table-cell">{agency.owner_name || "\u2014"}</td>
        <td className="py-3 text-center">{agency.client_count ?? 0}</td>
        <td className="py-3 hidden md:table-cell">
          {agency.commission_earned ? `$${Number(agency.commission_earned).toLocaleString()}` : "\u2014"}
        </td>
        <td className="py-3 text-muted-foreground text-xs hidden lg:table-cell">
          {agency.created_at ? format(new Date(agency.created_at), "MMM d, yyyy") : "\u2014"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-8 py-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !clients?.length ? (
              <p className="text-sm text-muted-foreground">No provisioned tenants.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Provisioned Tenants:</p>
                {clients.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{t.business_mode}</Badge>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAgenciesPage() {
  const { data: agencies, isLoading } = useAdminAgencies();

  const totalAgencies = agencies?.length ?? 0;
  const totalClients = agencies?.reduce((sum, a) => sum + (a.client_count ?? 0), 0) ?? 0;
  const totalCommission = agencies?.reduce((sum, a) => sum + (a.commission_earned ?? 0), 0) ?? 0;

  const statCards = [
    { label: "Total Agencies", value: totalAgencies, icon: Users2 },
    { label: "Agency Clients", value: totalClients, icon: Building2 },
    { label: "Total Commission", value: totalCommission ? `$${totalCommission.toLocaleString()}` : "\u2014", icon: DollarSign },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Agencies</h1>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Agencies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !agencies?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No agencies yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 w-8"></th>
                    <th className="pb-2 font-medium text-muted-foreground">Company</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden sm:table-cell">Owner</th>
                    <th className="pb-2 font-medium text-muted-foreground text-center">Clients</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden md:table-cell">Commission</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {agencies.map((agency) => (
                    <AgencyExpandRow key={agency.id} agency={agency} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
