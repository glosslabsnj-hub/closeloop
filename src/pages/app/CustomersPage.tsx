import { useState, useMemo } from "react";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { useCustomerEnrichment } from "@/hooks/useCustomerEnrichment";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Plus, Search, Upload, ChevronDown, Phone as PhoneIcon,
  MapPin, CalendarCheck, UserPlus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { CustomerDetailSheet } from "@/components/customers/CustomerDetailSheet";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import CustomerMergeQueue from "@/components/customers/CustomerMergeQueue";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { CustomerCSVImportDialog } from "@/components/customers/CustomerCSVImportDialog";

const sourceLabels: Record<string, string> = {
  ai_call: "AI Call",
  manual: "Manual",
  referral: "Referral",
  website_form: "Website",
  walk_in: "Walk-in",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getModeLabels(mode: string) {
  const map: Record<string, { address: string; lastService: string; customerLabel: string; customersLabel: string }> = {
    service: { address: "Service Address", lastService: "Last Service", customerLabel: "Customer", customersLabel: "Customers" },
    dispatch: { address: "Pickup Location", lastService: "Last Job", customerLabel: "Customer", customersLabel: "Customers" },
    food: { address: "Delivery Address", lastService: "Last Order", customerLabel: "Guest", customersLabel: "Guests" },
    medical: { address: "Patient Address", lastService: "Last Visit", customerLabel: "Patient", customersLabel: "Patients" },
    sales: { address: "Address", lastService: "Last Appointment", customerLabel: "Prospect", customersLabel: "Prospects" },
    general: { address: "Address", lastService: "Last Interaction", customerLabel: "Customer", customersLabel: "Customers" },
  };
  return map[mode] || map.service;
}

export default function CustomersPage() {
  const { customers, isLoading } = useCustomers();
  const { _terms, mode } = useIndustryContext();
  const { _businessMode } = useTenantConfig();
  const modeLabels = getModeLabels(mode);

  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);
  const { data: enrichmentMap } = useCustomerEnrichment(customerIds);

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bookingCustomerName, setBookingCustomerName] = useState("");
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState("");

  const activeCustomers = useMemo(
    () => customers.filter((c) => (c.tags as string[] | null)?.includes("active_customer")),
    [customers]
  );

  const baseList = activeTab === "active" ? activeCustomers : customers;

  const filteredCustomers = useMemo(() => {
    let result = baseList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone_e164.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.service_address?.toLowerCase().includes(q)
      );
    }
    if (sourceFilter !== "all") {
      result = result.filter((c) => c.source === sourceFilter);
    }
    if (sortBy === "recent") {
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return result;
  }, [baseList, searchQuery, sourceFilter, sortBy]);

  // Stats
  const _totalCount = customers.length;
  const _activeCount = activeCustomers.length;
  const _withEmail = customers.filter((c) => c.email).length;
  const _recentCount = customers.filter((c) => {
    const created = new Date(c.created_at).getTime();
    return Date.now() - created < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  const handleBookFromDetail = (customer: Customer) => {
    setBookingCustomerName(customer.full_name);
    setBookingCustomerPhone(customer.phone_e164);
    setBookingDialogOpen(true);
  };

  return (
    <ErrorBoundary>
    <PageContainer maxWidth="xl">
      <PageHeader
        title={modeLabels.customersLabel === "Customer" ? "Customers" : modeLabels.customersLabel}
        description={`Your complete ${modeLabels.customersLabel.toLowerCase()} database`}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  Import from CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add {modeLabels.customerLabel}
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{customers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{activeCustomers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="merge">
            Merge Queue
          </TabsTrigger>
        </TabsList>

        {["all", "active"].map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-6 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${modeLabels.customersLabel.toLowerCase()}...`}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="ai_call">AI Call</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website_form">Website</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "recent")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery || sourceFilter !== "all" ? "No matches" : `No ${modeLabels.customersLabel.toLowerCase()} yet`}
                description={
                  searchQuery || sourceFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : `${modeLabels.customersLabel} will appear here when they call or are added manually.`
                }
                action={
                  !searchQuery && sourceFilter === "all"
                    ? { label: `Add ${modeLabels.customerLabel}`, onClick: () => setCreateDialogOpen(true) }
                    : undefined
                }
              />
            ) : (
              <SectionCard noPadding>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">{modeLabels.address}</TableHead>
                      <TableHead className="hidden md:table-cell">{modeLabels.lastService}</TableHead>
                      <TableHead className="hidden lg:table-cell">Calls</TableHead>
                      <TableHead className="hidden sm:table-cell">Source</TableHead>
                      <TableHead className="hidden sm:table-cell">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const enrichment = enrichmentMap?.get(customer.id);
                      return (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(customer)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                                {getInitials(customer.full_name)}
                              </div>
                              <div>
                                <p className="font-medium">{customer.full_name}</p>
                                <p className="text-sm text-muted-foreground sm:hidden">
                                  {customer.phone_e164}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {customer.phone_e164}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {customer.email || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[180px] truncate">
                            {customer.service_address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {customer.service_address}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {enrichment?.lastServiceDate
                              ? format(new Date(enrichment.lastServiceDate), "MMM d, yyyy")
                              : "Never"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {enrichment?.recentCallCount ? (
                              <Badge variant="secondary" className="text-xs">
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                {enrichment.recentCallCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">0</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {sourceLabels[customer.source || ""] || customer.source || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </SectionCard>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? modeLabels.customerLabel.toLowerCase() : modeLabels.customersLabel.toLowerCase()}
            </p>
          </TabsContent>
        ))}

        <TabsContent value="merge" className="mt-6">
          <CustomerMergeQueue />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onBookAppointment={handleBookFromDetail}
      />

      <CreateCustomerDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <CustomerCSVImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <CreateBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        initialCustomerName={bookingCustomerName}
        initialCustomerPhone={bookingCustomerPhone}
      />
    </PageContainer>
    </ErrorBoundary>
  );
}
