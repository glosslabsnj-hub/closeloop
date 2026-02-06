import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toolbar, FilterSelect } from "@/components/layout/Toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Download,
  Upload,
  Star,
  AlertTriangle,
  Sparkles,
  User,
  Loader2,
  MoreHorizontal,
  Phone,
  Mail,
  Eye,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { EmptyState } from "@/components/ui/empty-state";

type StatusFilter = "all" | "active" | "new" | "vip" | "attention";

const PAGE_SIZE = 15;

// Helper to determine customer status badges
function getCustomerStatus(customer: Customer): {
  type: StatusFilter;
  label: string;
  icon: React.ReactNode;
} | null {
  // Check tags for VIP
  if (customer.tags?.includes("vip")) {
    return { type: "vip", label: "VIP", icon: <Star className="h-3 w-3" /> };
  }

  // Check if new (created within last 7 days)
  const createdDaysAgo = differenceInDays(new Date(), parseISO(customer.created_at));
  if (createdDaysAgo <= 7) {
    return { type: "new", label: "New", icon: <Sparkles className="h-3 w-3" /> };
  }

  // Check for attention needed (e.g., no recent interaction in 30+ days)
  const updatedDaysAgo = differenceInDays(new Date(), parseISO(customer.updated_at));
  if (updatedDaysAgo > 30) {
    return {
      type: "attention",
      label: "Needs follow-up",
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  }

  return null;
}

// Mock stats for demo - in production would come from aggregated data
function getMockStats(customerId: string) {
  const hash = customerId.charCodeAt(0) + customerId.charCodeAt(customerId.length - 1);
  return {
    visits: (hash % 20) + 1,
    totalSpent: ((hash % 50) + 5) * 45,
    lastVisit: new Date(Date.now() - (hash % 30) * 24 * 60 * 60 * 1000),
  };
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { customers, isLoading, deleteCustomer } = useCustomers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(query) ||
          c.phone_e164?.includes(query) ||
          c.phone_raw?.includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => {
        const status = getCustomerStatus(c);
        if (statusFilter === "active") {
          // Active = visited in last 30 days
          const updatedDaysAgo = differenceInDays(new Date(), parseISO(c.updated_at));
          return updatedDaysAgo <= 30;
        }
        return status?.type === statusFilter;
      });
    }

    return result;
  }, [customers, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleViewCustomer = (customer: Customer) => {
    navigate(`/app/customers/${customer.id}`);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (confirm(`Are you sure you want to delete ${customer.full_name}?`)) {
      deleteCustomer.mutate(customer.id);
    }
  };

  const formatPhone = (phone: string) => {
    // Format E.164 to readable
    if (phone.startsWith("+1") && phone.length === 12) {
      return `${phone.slice(2, 5)}-${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLastVisit = (date: Date) => {
    const daysAgo = differenceInDays(new Date(), date);
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return formatDistanceToNow(date, { addSuffix: false });
  };

  const statusCounts = useMemo(() => {
    let active = 0;
    let newCount = 0;
    let vip = 0;
    let attention = 0;

    customers.forEach((c) => {
      const status = getCustomerStatus(c);
      if (status?.type === "vip") vip++;
      else if (status?.type === "new") newCount++;
      else if (status?.type === "attention") attention++;
      
      const updatedDaysAgo = differenceInDays(new Date(), parseISO(c.updated_at));
      if (updatedDaysAgo <= 30) active++;
    });

    return { active, new: newCount, vip, attention };
  }, [customers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <PageHeader
        title="Customers"
        icon={<Users className="h-5 w-5" />}
        action={
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      {/* Search */}
      <Toolbar
        searchPlaceholder="Search by name, phone, or email..."
        searchValue={search}
        onSearchChange={handleSearchChange}
      />

      {/* Status Tabs */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => handleStatusFilterChange(v as StatusFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              Active
              {statusCounts.active > 0 && (
                <Badge variant="secondary" size="sm">
                  {statusCounts.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              New
              {statusCounts.new > 0 && (
                <Badge variant="secondary" size="sm">
                  {statusCounts.new}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vip" className="gap-1.5">
              VIP
              {statusCounts.vip > 0 && (
                <Badge variant="secondary" size="sm">
                  {statusCounts.vip}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="attention" className="gap-1.5">
              Needs Attention
              {statusCounts.attention > 0 && (
                <Badge variant="warning" size="sm">
                  {statusCounts.attention}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Customer count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? "Customer" : "Customers"}
        </p>
      </div>

      {/* Table */}
      {filteredCustomers.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Visits</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => {
                const status = getCustomerStatus(customer);
                const stats = getMockStats(customer.id);

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {customer.full_name || "Unnamed"}
                          </p>
                          {status && (
                            <Badge
                              variant={
                                status.type === "vip"
                                  ? "default"
                                  : status.type === "new"
                                  ? "secondary"
                                  : "warning"
                              }
                              size="sm"
                              className={cn(
                                "mt-1 gap-1",
                                status.type === "vip" &&
                                  "bg-warning/15 text-warning border-warning/20"
                              )}
                            >
                              {status.icon}
                              {status.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {formatPhone(customer.phone_e164)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{stats.visits}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {formatCurrency(stats.totalSpent)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {formatLastVisit(stats.lastVisit)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCustomer(customer);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit would open detail sheet in edit mode
                              handleViewCustomer(customer);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${customer.phone_e164}`, "_blank");
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </DropdownMenuItem>
                          {customer.email && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`mailto:${customer.email}`, "_blank");
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomer(customer);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={currentPage === pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={cn(
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-0">
            <EmptyState
              icon={Users}
              title={search || statusFilter !== "all" ? "No customers found" : "No customers yet"}
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Customers are automatically added when they call. You can also import your existing customer list."
              }
              emojiStyle
              action={
                !search && statusFilter === "all"
                  ? {
                      label: "Import Customers",
                      icon: Upload,
                      onClick: () => {},
                    }
                  : undefined
              }
              secondaryAction={
                !search && statusFilter === "all"
                  ? {
                      label: "Add Manually",
                      icon: Plus,
                      onClick: () => setAddDialogOpen(true),
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <AddCustomerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
