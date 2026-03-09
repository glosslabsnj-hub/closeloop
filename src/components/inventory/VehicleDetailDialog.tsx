import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Gauge, Calendar, MapPin, Palette, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/proxyImage";

interface VehicleItem {
  id: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_style: string | null;
  color_exterior: string | null;
  color_interior: string | null;
  msrp_cents: number | null;
  asking_price_cents: number | null;
  internet_price_cents: number | null;
  condition: string | null;
  mileage: number | null;
  status: string;
  features: string[] | null;
  description: string | null;
  photo_urls: string[] | null;
  listing_url: string | null;
  stock_number: string | null;
  vin: string | null;
  special_notes: string | null;
  lot_location: string | null;
  days_on_lot: number;
  financing_available: boolean | null;
  trade_in_eligible: boolean | null;
  last_synced_at: string | null;
}

function formatPrice(cents: number | null): string {
  if (!cents) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  sold: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  hold: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface Props {
  vehicle: VehicleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleDetailDialog({ vehicle, open, onOpenChange }: Props) {
  if (!vehicle) return null;

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  const descParts = vehicle.description?.split(" • ").filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        {/* Photo */}
        {vehicle.photo_urls && vehicle.photo_urls.length > 0 && (
          <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted">
            <img
              src={proxyImageUrl(vehicle.photo_urls[0])}
              alt={title}
              className="w-full h-full object-cover"
            />
            {vehicle.photo_urls.length > 1 && (
              <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                +{vehicle.photo_urls.length - 1} photos
              </Badge>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5">
            <DialogHeader className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-xl">{title}</DialogTitle>
                <Badge className={cn("text-xs shrink-0", statusColors[vehicle.status] || statusColors.available)}>
                  {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                </Badge>
              </div>
              {vehicle.trim && (
                <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
              )}
            </DialogHeader>

            {/* Pricing */}
            <div className="flex items-baseline gap-3">
              {vehicle.asking_price_cents && (
                <span className="text-2xl font-bold">
                  {formatPrice(vehicle.asking_price_cents)}
                </span>
              )}
              {vehicle.msrp_cents && vehicle.msrp_cents !== vehicle.asking_price_cents && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(vehicle.msrp_cents)}
                </span>
              )}
              {vehicle.internet_price_cents && vehicle.internet_price_cents !== vehicle.asking_price_cents && (
                <span className="text-sm text-primary">
                  Internet: {formatPrice(vehicle.internet_price_cents)}
                </span>
              )}
            </div>

            <Separator />

            {/* Key specs grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {vehicle.mileage != null && (
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{vehicle.mileage.toLocaleString()} miles</span>
                </div>
              )}
              {vehicle.color_exterior && (
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Ext: {vehicle.color_exterior}</span>
                </div>
              )}
              {vehicle.color_interior && (
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Int: {vehicle.color_interior}</span>
                </div>
              )}
              {vehicle.body_style && (
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{vehicle.body_style}</span>
                </div>
              )}
              {vehicle.condition && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{vehicle.condition.charAt(0).toUpperCase() + vehicle.condition.slice(1)}</Badge>
                </div>
              )}
              {vehicle.days_on_lot > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{vehicle.days_on_lot} days on lot</span>
                </div>
              )}
              {vehicle.lot_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{vehicle.lot_location}</span>
                </div>
              )}
            </div>

            {/* Engine / Drivetrain from description */}
            {descParts.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Specifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {descParts.map((part, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Features</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicle.features.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Seller Notes */}
            {vehicle.special_notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Seller Notes</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {vehicle.special_notes}
                  </p>
                </div>
              </>
            )}

            {/* IDs & Meta */}
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {vehicle.stock_number && <span>Stock #: {vehicle.stock_number}</span>}
              {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
              {vehicle.financing_available && <Badge variant="outline" className="text-[10px] w-fit">Financing Available</Badge>}
              {vehicle.trade_in_eligible && <Badge variant="outline" className="text-[10px] w-fit">Trade-In Eligible</Badge>}
              {vehicle.last_synced_at && (
                <span className="col-span-2">
                  Last synced: {new Date(vehicle.last_synced_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* View listing link */}
            {vehicle.listing_url && (
              <a
                href={vehicle.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View original listing
              </a>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
