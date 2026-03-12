/**
 * ImpoundLotPage - Main impound lot inventory management
 * 
 * Features:
 * - View all vehicles in lot with search/filter
 * - Quick-add form for drivers (tablet-friendly)
 * - Bulk CSV import
 * - Vehicle status management (in_lot, pending_release, released)
 * - Fee tracking and release processing
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Warehouse,
  Plus,
  Upload,
  Search,
  Loader2,
  Car,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { ImpoundVehicleCard } from "@/components/impound/ImpoundVehicleCard";
import { ImpoundQuickAddDialog } from "@/components/impound/ImpoundQuickAddDialog";
import { ImpoundBulkImportDialog } from "@/components/impound/ImpoundBulkImportDialog";
import { ImpoundVehicleDetailDialog } from "@/components/impound/ImpoundVehicleDetailDialog";

type ImpoundVehicle = {
  id: string;
  tenant_id: string;
  lot_id: string | null;
  license_plate: string | null;
  license_plate_state: string | null;
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  towed_from_address: string | null;
  towed_at: string;
  tow_reason: string | null;
  dispatch_job_id: string | null;
  status: string | null;
  base_tow_fee_cents: number | null;
  storage_fee_daily_cents: number | null;
  days_stored: number | null;
  total_fees_cents: number | null;
  admin_fee_cents: number | null;
  gate_fee_cents: number | null;
  released_at: string | null;
  released_to_name: string | null;
  released_to_phone: string | null;
  release_notes: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
  impound_lots?: { name: string } | null;
};

export default function ImpoundLotPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("in_lot");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<ImpoundVehicle | null>(null);

  // Fetch vehicles
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["impound-vehicles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("impound_vehicles")
        .select("*, impound_lots(name)")
        .eq("tenant_id", tenant.id)
        .order("towed_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ImpoundVehicle[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch lots for default selection
  const { data: lots } = useQuery({
    queryKey: ["impound-lots", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("impound_lots")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((vehicle) => {
      // Status filter
      if (statusFilter !== "all" && vehicle.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const plate = vehicle.license_plate?.toLowerCase() || "";
        const vin = vehicle.vin?.toLowerCase() || "";
        const make = vehicle.vehicle_make?.toLowerCase() || "";
        const model = vehicle.vehicle_model?.toLowerCase() || "";
        const color = vehicle.vehicle_color?.toLowerCase() || "";
        return (
          plate.includes(query) ||
          vin.includes(query) ||
          make.includes(query) ||
          model.includes(query) ||
          color.includes(query)
        );
      }

      return true;
    });
  }, [vehicles, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!vehicles) return { inLot: 0, pendingRelease: 0, releasedToday: 0, totalFees: 0 };
    
    const today = new Date().toDateString();
    const inLot = vehicles.filter(v => v.status === "in_lot").length;
    const pendingRelease = vehicles.filter(v => v.status === "pending_release").length;
    const releasedToday = vehicles.filter(v => 
      v.status === "released" && 
      v.released_at && 
      new Date(v.released_at).toDateString() === today
    ).length;
    const totalFees = vehicles
      .filter(v => v.status === "in_lot" || v.status === "pending_release")
      .reduce((sum, v) => sum + (v.total_fees_cents || 0), 0);

    return { inLot, pendingRelease, releasedToday, totalFees };
  }, [vehicles]);

  const handleVehicleClick = (vehicle: ImpoundVehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["impound-vehicles"] });
  };

  if (moduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    );
  }
  if (!isAllowed) {
    return (
      <ModuleUnavailablePage
        title="Impound Lot Not Available"
        description="Impound lot management requires the Impound Lot module to be enabled for your account."
        moduleName="Impound Lot"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading impound lot">
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={<Warehouse className="h-5 w-5" />}
          title="Impound Lot"
          description="Track vehicles in storage and process releases"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={() => setQuickAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">In Lot</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.inLot}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Pending Release</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.pendingRelease}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Released Today</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.releasedToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Pending Fees</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                ${(stats.totalFees / 100).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="in_lot">In Lot</SelectItem>
                <SelectItem value="pending_release">Pending Release</SelectItem>
                <SelectItem value="released">Released</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search plate, VIN, make..."
              className="w-full sm:w-64 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Vehicle grid */}
        {filteredVehicles.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No vehicles found"
            description={
              statusFilter !== "all" || searchQuery
                ? "Try adjusting your filters to see more results."
                : "Add vehicles to your impound lot to start tracking inventory."
            }
            action={
              statusFilter === "all" && !searchQuery
                ? { label: "Add Vehicle", onClick: () => setQuickAddOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <ImpoundVehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onClick={() => handleVehicleClick(vehicle)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ImpoundQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultLotId={lots?.[0]?.id}
        onSuccess={handleRefresh}
      />

      <ImpoundBulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        defaultLotId={lots?.[0]?.id}
        onSuccess={handleRefresh}
      />

      {selectedVehicle && (
        <ImpoundVehicleDetailDialog
          vehicle={selectedVehicle}
          open={!!selectedVehicle}
          onOpenChange={(open) => !open && setSelectedVehicle(null)}
          onUpdate={handleRefresh}
        />
      )}
    </PageContainer>
    </ErrorBoundary>
  );
}
