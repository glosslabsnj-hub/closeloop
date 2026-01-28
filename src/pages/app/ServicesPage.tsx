import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Clock, DollarSign } from "lucide-react";

const demoServices = [
  {
    id: "1",
    name: "Basic Wash",
    description: "Exterior wash and interior vacuum",
    duration: 60,
    priceType: "fixed",
    price: 50,
    deposit: 0,
    isActive: true,
  },
  {
    id: "2",
    name: "Full Detail",
    description: "Complete interior and exterior detailing",
    duration: 180,
    priceType: "fixed",
    price: 200,
    deposit: 50,
    isActive: true,
  },
  {
    id: "3",
    name: "Ceramic Coating",
    description: "Professional ceramic coating application",
    duration: 480,
    priceType: "starting_at",
    price: 800,
    deposit: 200,
    isActive: true,
  },
  {
    id: "4",
    name: "Interior Only",
    description: "Deep interior cleaning and conditioning",
    duration: 120,
    priceType: "fixed",
    price: 100,
    deposit: 25,
    isActive: false,
  },
];

export default function ServicesPage() {
  const { tenant } = useAuth();
  const [services, setServices] = useState(demoServices);
  const [editingService, setEditingService] = useState<typeof demoServices[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleService = (id: string) => {
    setServices(
      services.map((s) =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage your service menu and pricing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setEditingService(null)}>
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
              <DialogDescription>
                Configure your service details and pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input placeholder="Full Detail" defaultValue={editingService?.name} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="Complete interior and exterior..." defaultValue={editingService?.description} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="180" defaultValue={editingService?.duration} />
                </div>
                <div className="space-y-2">
                  <Label>Price Type</Label>
                  <Select defaultValue={editingService?.priceType || "fixed"}>
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
                  <Input type="number" placeholder="200" defaultValue={editingService?.price} />
                </div>
                <div className="space-y-2">
                  <Label>Deposit ($)</Label>
                  <Input type="number" placeholder="50" defaultValue={editingService?.deposit} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                {editingService ? "Save Changes" : "Add Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id} className={!service.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </div>
                <Switch
                  checked={service.isActive}
                  onCheckedChange={() => toggleService(service.id)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(service.duration)}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <DollarSign className="h-3 w-3" />
                  {service.priceType === "starting_at" && "From "}
                  ${service.price}
                </Badge>
                {service.deposit > 0 && (
                  <Badge variant="outline" className="gap-1">
                    ${service.deposit} deposit
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingService(service);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {services.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No services yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first service to start booking appointments.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
