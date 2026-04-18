import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Clock, X, Check } from "lucide-react";
import { useTaskAlerts, useTasks } from "@/hooks/useDashboardTasksQuery";
import { useDocumentAlerts } from "@/hooks/useDocumentSummaryQuery";

export interface Notification {
  id: string;
  message: string;
  type: "danger" | "warning" | "info";
  time: string;
  read: boolean;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onNotificationUpdate?: (notifications: Notification[]) => void;
}

const NotificationCenter = ({ 
  notifications: initialNotifications = [], 
  onNotificationUpdate 
}: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const { data: taskAlerts } = useTaskAlerts();
const { data: documentAlerts } = useDocumentAlerts();
  const { tasks } = useTasks();

  // Filter out alerts for completed tasks
  const activeTaskAlerts = taskAlerts?.filter(alert => {
    const task = tasks?.find(t => t.id === alert.task_id);
    return task && task.status !== 'completed';
  }) || [];

  // All document alerts are active (expiring or expired)
  const activeDocumentAlerts = documentAlerts || [];

  // Merge alerts with notifications
  const allNotifications = [
    ...initialNotifications,
    ...(activeTaskAlerts.map(alert => {
      const dueDate = new Date(alert.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let timeText: string;
      if (daysDiff === 0) {
        timeText = "Today";
      } else if (daysDiff === 1) {
        timeText = "Tomorrow";
      } else if (daysDiff === -1) {
        timeText = "Yesterday";
      } else if (daysDiff > 0) {
        timeText = `In ${daysDiff} days`;
      } else {
        timeText = `${Math.abs(daysDiff)} days ago`;
      }
      
      return {
        id: `alert-${alert.id}`,
        message: alert.message,
        type: alert.type as "danger" | "warning" | "info",
        time: timeText,
        read: false
      };
    })),
    ...(activeDocumentAlerts.map(alert => ({
      id: `doc-alert-${alert.id}`,
      message: `Document "${alert.name}" is ${alert.status === 'expired' ? 'expired' : 'expiring soon'}`,
      type: alert.status === 'expired' ? 'danger' : 'warning',
      time: alert.expiry_date || 'No expiry',
      read: false
    })) || [])
  ];

  const unreadCount = allNotifications.filter((n) => !n.read && !readNotifications.has(n.id)).length;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllRead = () => {
    const allIds = allNotifications.map(n => n.id);
    setReadNotifications(new Set(allIds));
  };

  const dismiss = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
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
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {allNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                allNotifications.map((n) => {
                  const isRead = n.read || readNotifications.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 flex items-start gap-3 text-sm transition-colors hover:bg-accent/50 ${
                        !isRead ? "bg-primary/5" : ""
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
                        <p className={`text-foreground ${!isRead ? "font-medium" : ""}`}>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
