import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Phone, Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown } from "lucide-react";

interface MobileHeaderProps {
  effectiveTenant: any;
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function MobileHeader({ effectiveTenant, onMenuClick, onSearchClick }: MobileHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border/50 flex items-center justify-between px-3">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Phone className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">CloseLoop</span>
        </div>
      </div>

      {/* Center: Business Name Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-sm font-medium">
            <span className="truncate max-w-[120px]">
              {effectiveTenant?.name || "My Business"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/app/settings?section=profile")}>
            Business Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/app/business-brain")}>
            Business Brain
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right: Notifications */}
      <div className="flex items-center">
        <NotificationBell />
      </div>
    </header>
  );
}
