import { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SkeletonTable, SkeletonStatCard } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { StatCard } from "@/components/layout/StatCard";
import { Toolbar, FilterSelect } from "@/components/layout/Toolbar";
import { Plus, MoreHorizontal, Phone, Mail, Calendar, MessageSquare, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  contacted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  qualified: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  booked: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  won: "bg-success/10 text-success",
  lost: "bg-muted text-muted-foreground",
};

const sourceLabels: Record<string, string> = {
  missed_call: "Missed Call",
  website_form: "Website",
  manual: "Manual",
  referral: "Referral",
};

export default function LeadsPage() {
  const { leads, isLoading, stats } = useLeads();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Leads"
        description="Leads are automatically captured from calls and messages"
        action={
          <Button className="gap-2" variant="outline" disabled title="Leads are automatically captured from calls and messages">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        }
      />

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Leads"
            value={stats.total}
            icon={Users}
            description="All time"
          />
          <StatCard
            label="New"
            value={stats.new}
            icon={TrendingUp}
            description="Need attention"
            variant="primary"
          />
          <StatCard
            label="Booked"
            value={stats.booked}
            icon={Calendar}
            description="Appointments"
            variant="success"
          />
          <StatCard
            label="Won"
            value={stats.won}
            icon={TrendingUp}
            description="Converted"
            variant="success"
          />
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        searchPlaceholder="Search leads..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <FilterSelect
            placeholder="Status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: "all", label: "All Status" },
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "booked", label: "Booked" },
              { value: "won", label: "Won" },
              { value: "lost", label: "Lost" },
            ]}
          />
        }
      />

      {/* Table */}
      <SectionCard noPadding>
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={8} columns={5} />
          </div>
        ) : filteredLeads.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Last Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} zebra>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.phone || "No phone"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{sourceLabels[lead.source] || lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusColors[lead.status])}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {lead.last_message_at
                      ? formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Phone className="mr-2 h-4 w-4" />
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="mr-2 h-4 w-4" />
                          Book Appointment
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Quote
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Users}
            title="No leads found"
            description="Leads will appear here when you receive calls, texts, or add them manually."
            action={{
              label: "Add Your First Lead",
              onClick: () => {},
            }}
            compact
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
