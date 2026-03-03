import { useState, useMemo } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Warehouse, Search, Loader2 } from "lucide-react";
import { useSalesInventory } from "@/hooks/useSalesInventory";
import { EmptyState } from "@/components/ui/empty-state";
import { VehicleDetailDialog } from "@/components/inventory/VehicleDetailDialog";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/proxyImage";
import { InventorySyncPanel } from "@/components/inventory/InventorySyncPanel";

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  sold: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  hold: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  incoming: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

function formatPrice(cents: number | null): string {
  if (!cents) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function SalesInventoryPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["sales_inventory"]);
  const { inventory, isLoading, stats, _refetch } = useSalesInventory();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (conditionFilter !== "all" && item.condition !== conditionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = `${item.year || ""} ${item.make || ""} ${item.model || ""} ${item.trim || ""} ${item.stock_number || ""} ${item.vin || ""} ${item.color_exterior || ""}`.toLowerCase();
        return desc.includes(q);
      }
      return true;
    });
  }, [inventory, statusFilter, conditionFilter, searchQuery]);

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading your inventory">
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={Warehouse}
          title="Inventory"
          description={`${stats.available} available, ${stats.total} total items`}
        />

        {/* Self-service inventory import */}
        <InventorySyncPanel
          lastSyncedAt={inventory.length > 0 ? inventory[0].last_synced_at ?? inventory[0].updated_at : null}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by year, make, model, color, stock #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
              <SelectItem value="incoming">Incoming</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Condition</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {inventory.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No inventory yet"
            description="Add items manually or sync from your DMS system."
          />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching items"
            description="Try adjusting your filters."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInventory.map((item) => {
              const titleParts: string[] = [];
              if (item.year) titleParts.push(item.year);
              if (item.make) titleParts.push(item.make);
              if (item.model) titleParts.push(item.model);
              const title = titleParts.join(" ") || "Unnamed Item";
              const hasPhoto = item.photo_urls && item.photo_urls.length > 0;

              return (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition-shadow cursor-pointer hover:ring-1 hover:ring-primary/20"
                  onClick={() => setSelectedVehicle(item)}
                >
                  {/* Thumbnail */}
                  {hasPhoto && (
                    <div className="relative w-full h-32 overflow-hidden rounded-t-lg bg-muted">
                      <img
                        src={proxyImageUrl((item.photo_urls as string[])[0])}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className={cn("p-4 space-y-2", !hasPhoto && "pt-4")}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-sm">{title}</h3>
                        {item.trim && <p className="text-xs text-muted-foreground">{item.trim}</p>}
                      </div>
                      <Badge className={cn("text-[10px]", statusColors[item.status] || statusColors.available)}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {item.condition && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.condition}
                        </Badge>
                      )}
                      {item.color_exterior && <span>{item.color_exterior}</span>}
                      {item.mileage != null && <span>{item.mileage.toLocaleString()} mi</span>}
                    </div>

                    <div className="flex items-baseline gap-2">
                      {item.asking_price_cents && (
                        <span className="text-sm font-semibold">
                          {formatPrice(item.asking_price_cents)}
                        </span>
                      )}
                      {item.msrp_cents && item.msrp_cents !== item.asking_price_cents && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(item.msrp_cents)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {item.stock_number && <span>Stock: {item.stock_number}</span>}
                      {item.days_on_lot > 0 && <span>{item.days_on_lot}d on lot</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <VehicleDetailDialog
        vehicle={selectedVehicle}
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
      />
    </PageContainer>
    </ErrorBoundary>
  );
}
