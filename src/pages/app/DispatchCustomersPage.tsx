/**
 * Dispatch Customers Page
 * 
 * Optimized customer management for dispatch/towing companies:
 * - Account type filtering (Individual, Commercial, Insurance, Municipal)
 * - Job history and revenue per customer
 * - Quick dispatch capability
 * - Saved locations per customer
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button } from "@/components/ui/button";
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
  Plus,
  Download,
  Upload,
  Loader2,
  Users,
  Building2,
  Shield,
  User,
} from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DispatchCustomerCard,
  DispatchCustomerStats,
  DispatchQuickDispatchDialog,
  DispatchAccountType,
} from "@/components/customers/dispatch";
import { toast } from "@/hooks/use-toast";

type AccountFilter = "all" | "individual" | "commercial" | "insurance" | "municipal";

const PAGE_SIZE = 12;

// Derive account type from tags or other fields
function getAccountType(customer: Customer): DispatchAccountType {
  const tags = customer.tags || [];
  if (tags.includes("insurance") || tags.includes("motor_club")) return "insurance";
  if (tags.includes("commercial") || tags.includes("dealership") || tags.includes("fleet")) return "commercial";
  if (tags.includes("municipal") || tags.includes("police")) return "municipal";
  return "individual";
}

// Mock stats - in production would come from aggregated dispatch_requests
function getMockDispatchStats(customerId: string) {
  const hash = customerId.charCodeAt(0) + customerId.charCodeAt(customerId.length - 1);
  return {
    job_count: (hash % 25) + 1,
    total_revenue: ((hash % 40) + 5) * 125,
    last_job_date: new Date(Date.now() - (hash % 30) * 24 * 60 * 60 * 1000).toISOString(),
    saved_locations: hash % 3 === 0 ? [
      { label: "Home", address: "123 Main St, Anytown" },
      { label: "Work", address: "456 Business Ave, Cityville" },
    ] : [],
  };
}

export default function DispatchCustomersPage() {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomers();

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickDispatchCustomer, setQuickDispatchCustomer] = useState<Customer | null>(null);

  // Enhance customers with dispatch-specific data
  const enhancedCustomers = useMemo(() => {
    return customers.map((c) => ({
      ...c,
      account_type: getAccountType(c),
      company_name: c.tags?.includes("commercial") ? c.full_name : null,
      is_vip: c.tags?.includes("vip"),
      ...getMockDispatchStats(c.id),
    }));
  }, [customers]);

  // Calculate stats
  const stats = useMemo(() => {
    const individuals = enhancedCustomers.filter((c) => c.account_type === "individual").length;
    const commercial = enhancedCustomers.filter((c) => c.account_type === "commercial").length;
    const insurance = enhancedCustomers.filter((c) => c.account_type === "insurance" || c.account_type === "municipal").length;
    const totalRevenue = enhancedCustomers.reduce((sum, c) => sum + (c.total_revenue || 0), 0);

    return {
      total: enhancedCustomers.length,
      individuals,
      commercial,
      insurance,
      totalRevenue,
    };
  }, [enhancedCustomers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let result = enhancedCustomers;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(query) ||
          c.phone_e164?.includes(query) ||
          c.phone_raw?.includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.company_name?.toLowerCase().includes(query)
      );
    }

    // Account type filter
    if (accountFilter !== "all") {
      result = result.filter((c) => c.account_type === accountFilter);
    }

    // Sort by revenue (highest first)
    result.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));

    return result;
  }, [enhancedCustomers, search, accountFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: AccountFilter) => {
    setAccountFilter(value);
    setCurrentPage(1);
  };

  const handleViewCustomer = (customer: Customer) => {
    navigate(`/app/customers/${customer.id}`);
  };

  const handleDispatch = (customer: any) => {
    setQuickDispatchCustomer(customer);
  };

  const handleQuickDispatchSubmit = (data: any) => {
    // In production, this would create a dispatch request
    toast.success("Job Created", `New ${data.job_type} job dispatched`);
    setQuickDispatchCustomer(null);
    // Navigate to dispatch queue
    navigate("/app/dispatch");
  };

  const accountCounts = useMemo(() => {
    return {
      individual: enhancedCustomers.filter((c) => c.account_type === "individual").length,
      commercial: enhancedCustomers.filter((c) => c.account_type === "commercial").length,
      insurance: enhancedCustomers.filter((c) => c.account_type === "insurance").length,
      municipal: enhancedCustomers.filter((c) => c.account_type === "municipal").length,
    };
  }, [enhancedCustomers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        icon={<Users className="h-5 w-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
      />

      {/* Stats Bar */}
      <DispatchCustomerStats stats={stats} />

      {/* Search */}
      <Toolbar
        searchPlaceholder="Search by name, phone, company..."
        searchValue={search}
        onSearchChange={handleSearchChange}
      />

      {/* Account Type Tabs */}
      <div className="flex items-center justify-between gap-4">
        <Tabs
          value={accountFilter}
          onValueChange={(v) => handleFilterChange(v as AccountFilter)}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5">
              <User className="h-4 w-4" />
              Individual
              <span className="text-muted-foreground text-xs">({accountCounts.individual})</span>
            </TabsTrigger>
            <TabsTrigger value="commercial" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Commercial
              <span className="text-muted-foreground text-xs">({accountCounts.commercial})</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-1.5">
              <Shield className="h-4 w-4" />
              Insurance
              <span className="text-muted-foreground text-xs">({accountCounts.insurance})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? "customer" : "customers"}
        </p>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length > 0 ? (
        <>
          <div className="grid gap-3">
            {paginatedCustomers.map((customer) => (
              <DispatchCustomerCard
                key={customer.id}
                customer={customer}
                onView={() => handleViewCustomer(customer)}
                onCall={() => window.open(`tel:${customer.phone_e164}`, "_blank")}
                onDispatch={() => handleDispatch(customer)}
                onEdit={() => handleViewCustomer(customer)}
              />
            ))}
          </div>

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
              title="No customers yet"
              description="Add your first customer or they'll be created automatically when calls come in."
              action={{
                label: "Add Customer",
                onClick: () => setAddDialogOpen(true),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddCustomerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      
      <DispatchQuickDispatchDialog
        open={!!quickDispatchCustomer}
        onOpenChange={(open) => !open && setQuickDispatchCustomer(null)}
        customer={quickDispatchCustomer}
        onSubmit={handleQuickDispatchSubmit}
      />
    </div>
  );
}
