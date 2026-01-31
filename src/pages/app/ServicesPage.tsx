import { useState } from "react";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];
type PriceType = Database["public"]["Enums"]["price_type"];

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  deposit_amount: null,
  deposit_required: false,
};

export default function ServicesPage() {
  const { services, isLoading, createService, updateService, deleteService, toggleServiceActive } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      price_type: service.price_type,
      price_amount: service.price_amount ? Number(service.price_amount) : null,
      deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
      deposit_required: service.deposit_required || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    const serviceData = {
      name: formData.name,
      description: formData.description || null,
      duration_minutes: formData.duration_minutes,
      price_type: formData.price_type,
      price_amount: formData.price_amount,
      deposit_amount: formData.deposit_amount,
      deposit_required: formData.deposit_required,
    };

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, ...serviceData });
    } else {
      await createService.mutateAsync(serviceData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    await deleteService.mutateAsync(deletingService.id);
    setDeleteDialogOpen(false);
    setDeletingService(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Services</h1>
          <p className="page-subtitle">Manage your service menu and pricing</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className={!service.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>{service.description || "No description"}</CardDescription>
                  </div>
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={(checked) =>
                      toggleServiceActive.mutate({ id: service.id, is_active: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(service.duration_minutes)}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    {service.price_type === "starting_at" && "From "}
                    {service.price_type === "quote_only"
                      ? "Quote Only"
                      : service.price_amount
                      ? `$${service.price_amount}`
                      : "—"}
                  </Badge>
                  {service.deposit_required && service.deposit_amount && (
                    <Badge variant="outline" className="gap-1">
                      ${service.deposit_amount} deposit
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDeletingService(service);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={DollarSign}
              title="No services yet"
              description="Add your first service to start booking appointments."
              action={{
                label: "Add Service",
                onClick: openCreateDialog,
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>Configure your service details and pricing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full Detail"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Complete interior and exterior..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })
                  }
                  placeholder="180"
                />
              </div>
              <div className="space-y-2">
                <Label>Price Type</Label>
                <Select
                  value={formData.price_type}
                  onValueChange={(v) => setFormData({ ...formData, price_type: v as PriceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="starting_at">Starting At</SelectItem>
                    <SelectItem value="quote_only">Quote Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={formData.price_amount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_amount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="200"
                  disabled={formData.price_type === "quote_only"}
                />
              </div>
              <div className="space-y-2">
                <Label>Deposit ($)</Label>
                <Input
                  type="number"
                  value={formData.deposit_amount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deposit_amount: e.target.value ? parseFloat(e.target.value) : null,
                      deposit_required: e.target.value ? true : false,
                    })
                  }
                  placeholder="50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || createService.isPending || updateService.isPending}
            >
              {createService.isPending || updateService.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingService ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteService.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
