import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type OwnerNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";

const notificationIcons: Record<string, React.ElementType> = {
  upload_processing: Upload,
  upload_ready: CheckCircle2,
  upload_failed: AlertCircle,
  suggestions_pending: FileText,
  conflicts_detected: AlertTriangle,
  conflicts_resolved: PartyPopper,
};

const severityColors: Record<string, string> = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  critical: "text-destructive",
};

function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
}: {
  notification: OwnerNotification;
  onNavigate: (path: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = severityColors[notification.severity] || "text-muted-foreground";

  const handleClick = () => {
    onMarkRead(notification.id);
    if (notification.action_path) {
      onNavigate(notification.action_path);
    }
  };

  return (
    <DropdownMenuItem
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer",
        !notification.is_read && "bg-accent/50"
      )}
      onClick={handleClick}
    >
      <div className={cn("mt-0.5", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", !notification.is_read && "font-semibold")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
      )}
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, criticalCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant={criticalCount > 0 ? "destructive" : "default"}
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={handleNavigate}
                onMarkRead={markAsRead}
              />
            ))
          )}
        </ScrollArea>
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-sm text-muted-foreground"
              onClick={() => navigate("/app/business-brain?tab=updates")}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
