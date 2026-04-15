import { useState } from "react";
import { Bell, AlertTriangle, Clock, X, Check } from "lucide-react";

export interface Notification {
  id: string;
  message: string;
  type: "danger" | "warning" | "info";
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "1", message: "Trade License Renewal is overdue", type: "danger", time: "2 hours ago", read: false },
  { id: "2", message: "Employee Visa expiring in 7 days – Ahmed", type: "warning", time: "5 hours ago", read: false },
  { id: "3", message: "VAT Filing Q1 due in 14 days", type: "info", time: "1 day ago", read: false },
  { id: "4", message: "Insurance Policy expiring soon", type: "warning", time: "2 days ago", read: true },
  { id: "5", message: "Fire Safety Certificate due in 45 days", type: "info", time: "3 days ago", read: true },
];

const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 text-sm transition-colors hover:bg-accent/50 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {n.type === "danger" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : n.type === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <Clock className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-foreground ${!n.read ? "font-medium" : ""}`}>{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="p-1 rounded text-muted-foreground hover:text-success transition-colors"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(n.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
