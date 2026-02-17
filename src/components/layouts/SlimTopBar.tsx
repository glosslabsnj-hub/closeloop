import { useNavigate, Link } from "react-router-dom";
import { Search, Settings, HelpCircle, LogOut, Sun, Moon, AudioWaveform } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BRAND } from "@/config/brand";

interface SlimTopBarProps {
  userEmail: string;
  tenantName?: string;
  onSignOut: () => void;
}

export function SlimTopBar({ userEmail, tenantName, onSignOut }: SlimTopBarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <header className="hidden md:flex h-16 sticky top-0 z-30 items-center gap-2 bg-[hsl(222,47%,11%)] border-b border-[hsl(215,28%,17%)] px-6">

      {/* Branding */}
      <Link to="/app/dashboard" className="flex items-center gap-2.5">
        <div className="h-7 w-7 shrink-0 rounded-lg bg-primary flex items-center justify-center">
          <AudioWaveform className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm text-foreground">
          {tenantName || BRAND.name}
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: search, notifications, avatar */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-0.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {userEmail?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5 border-b border-border/50">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              {tenantName && <p className="text-xs text-muted-foreground truncate">{tenantName}</p>}
            </div>
            <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app/help")} className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
