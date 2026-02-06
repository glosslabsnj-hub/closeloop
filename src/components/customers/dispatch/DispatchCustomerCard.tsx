/**
 * Dispatch Customer Card
 * 
 * Compact card for dispatch customers showing:
 * - Account type badge
 * - Recent job count & revenue
 * - Quick action buttons (call, dispatch)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Truck,
  Building2,
  Shield,
  User,
  Star,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DispatchAccountType = "individual" | "commercial" | "insurance" | "municipal";

export interface DispatchCustomerCardProps {
  customer: {
    id: string;
    full_name: string;
    phone_e164: string;
    email?: string | null;
    account_type?: DispatchAccountType;
    company_name?: string | null;
    is_vip?: boolean;
    job_count?: number;
    total_revenue?: number;
    last_job_date?: string | null;
    saved_locations?: Array<{ label: string; address: string }>;
  };
  onView: () => void;
  onCall: () => void;
  onDispatch: () => void;
  onEdit: () => void;
}

const accountTypeConfig: Record<DispatchAccountType, { label: string; icon: typeof User; color: string }> = {
  individual: { label: "Individual", icon: User, color: "bg-muted text-muted-foreground" },
  commercial: { label: "Commercial", icon: Building2, color: "bg-blue-500/15 text-blue-500 border-blue-500/20" },
  insurance: { label: "Insurance", icon: Shield, color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" },
  municipal: { label: "Municipal", icon: Shield, color: "bg-purple-500/15 text-purple-500 border-purple-500/20" },
};

export function DispatchCustomerCard({
  customer,
  onView,
  onCall,
  onDispatch,
  onEdit,
}: DispatchCustomerCardProps) {
  const accountType = customer.account_type || "individual";
  const config = accountTypeConfig[accountType];
  const AccountIcon = config.icon;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatPhone = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <Card 
      className="group hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            accountType === "individual" ? "bg-muted" : config.color
          )}>
            <AccountIcon className="h-6 w-6" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    {customer.company_name || customer.full_name || "Unknown"}
                  </h3>
                  {customer.is_vip && (
                    <Star className="h-4 w-4 text-warning fill-warning flex-shrink-0" />
                  )}
                </div>
                {customer.company_name && customer.full_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    {customer.full_name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatPhone(customer.phone_e164)}
                </p>
              </div>

              {/* Account Type Badge */}
              <Badge variant="outline" className={cn("flex-shrink-0", config.color)}>
                {config.label}
              </Badge>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div>
                <span className="font-semibold">{customer.job_count || 0}</span>
                <span className="text-muted-foreground ml-1">jobs</span>
              </div>
              <div className="text-muted-foreground">•</div>
              <div>
                <span className="font-semibold">
                  {formatCurrency(customer.total_revenue || 0)}
                </span>
                <span className="text-muted-foreground ml-1">revenue</span>
              </div>
              {customer.saved_locations && customer.saved_locations.length > 0 && (
                <>
                  <div className="text-muted-foreground">•</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{customer.saved_locations.length} saved</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onCall();
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onDispatch();
              }}
            >
              <Truck className="h-4 w-4" />
              Dispatch
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  Edit Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
