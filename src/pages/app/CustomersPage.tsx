import { useState, useMemo } from "react";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Search, Loader2, Upload, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { CustomerDetailSheet } from "@/components/customers/CustomerDetailSheet";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
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

export default function CustomersPage() {
  const { customers, isLoading } = useCustomers();
  const { terms } = useIndustryContext();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");

  // Detail sheet
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Booking dialog (from detail sheet)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bookingCustomerName, setBookingCustomerName] = useState("");
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState("");

  // Lifecycle filtering
  const activeCustomers = useMemo(
    () => customers.filter((c) => (c.tags as string[] | null)?.includes("active_customer")),
    [customers]
  );
  const prospects = useMemo(
    () => customers.filter((c) => !(c.tags as string[] | null)?.includes("active_customer")),
    [customers]
  );

  const baseList = activeTab === "active" ? activeCustomers : activeTab === "prospects" ? prospects : customers;

  const filteredCustomers = useMemo(() => {
    let result = baseList;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone_e164.includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((c) => c.source === sourceFilter);
    }

    // Sort
    if (sortBy === "recent") {
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return result;
  }, [baseList, searchQuery, sourceFilter, sortBy]);

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  const handleBookFromDetail = (customer: Customer) => {
    setBookingCustomerName(customer.full_name);
    setBookingCustomerPhone(customer.phone_e164);
    setBookingDialogOpen(true);
  };

  const customerLabel = terms.customers
    ? terms.customers.charAt(0).toUpperCase() + terms.customers.slice(1)
    : "Customers";

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={Users}
        title={customerLabel}
        description={`Manage your ${terms.customers || "customers"} and their history`}
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
              <Plus className="h-4 w-4" />
              Add {terms.customer || "Customer"}
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
                  placeholder={`Search ${terms.customers || "customers"}...`}
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
                title={searchQuery || sourceFilter !== "all" ? "No matches" : `No ${terms.customers || "customers"} yet`}
                description={
                  searchQuery || sourceFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : `${customerLabel} will appear here when they call or are added manually.`
                }
                action={
                  !searchQuery && sourceFilter === "all"
                    ? { label: `Add ${terms.customer || "Customer"}`, onClick: () => setCreateDialogOpen(true) }
                    : undefined
                }
              />
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Source</TableHead>
                      <TableHead className="hidden sm:table-cell">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(customer)}
                      >
                        <TableCell>
                          <p className="font-medium">{customer.full_name}</p>
                          <p className="text-sm text-muted-foreground sm:hidden">
                            {customer.phone_e164}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {customer.phone_e164}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {customer.email || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {sourceLabels[customer.source || ""] || customer.source || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? terms.customer || "customer" : terms.customers || "customers"}
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

      {/* Create Dialog */}
      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* CSV Import Dialog */}
      <CustomerCSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Booking Dialog (from detail sheet) */}
      <CreateBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        initialCustomerName={bookingCustomerName}
        initialCustomerPhone={bookingCustomerPhone}
      />
    </PageContainer>
  );
}
