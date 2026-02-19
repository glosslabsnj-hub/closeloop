import { useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverJobs } from "@/hooks/useDriverJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, ClipboardList, PlusCircle, LogOut, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/driver", icon: ClipboardList, label: "Jobs" },
  { path: "/driver/impound", icon: PlusCircle, label: "Log Vehicle" },
  { path: "/driver/vehicle", icon: Truck, label: "My Truck" },
];

export function DriverLayout() {
  const { user, loading, signOut } = useAuth();
  const { driverRecord, activeJobs, isLoading: driverLoading } = useDriverJobs();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/driver-login", { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirect non-driver users: must have a fleet_drivers record linked to their account
  useEffect(() => {
    if (!loading && user && driverRecord === null) {
      // User is authenticated but has no driver record — not authorized for driver portal
      navigate("/app/dashboard", { replace: true });
    }
  }, [user, loading, driverRecord, navigate]);

  if (loading || driverLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Truck className="h-12 w-12 text-primary animate-pulse mb-4" />
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || driverRecord === null) {
    return null;
  }

  const firstName = driverRecord?.full_name?.split(" ")[0] || "Driver";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header - Clean and minimal */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {driverRecord?.photo_url ? (
                <img 
                  src={driverRecord.photo_url} 
                  alt={firstName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{firstName}</p>
              <p className="text-xs text-muted-foreground">Driver Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeJobs.length > 0 && (
              <Badge variant="secondary" className="font-mono">
                {activeJobs.length} active
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation - Large touch targets */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 safe-area-bottom">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-6 min-w-[80px] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "text-primary"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
