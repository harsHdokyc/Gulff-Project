import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Loader2, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTasks, useTaskStats, useTaskAlerts, useToggleTaskStatus } from "@/hooks/useDashboardTasksQuery";
import { Task } from "@/lib/dashboardTasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



const DashboardPage = () => {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const { tasks, isLoading, error } = useTasks();
  const { data: stats } = useTaskStats();
  const { data: alerts } = useTaskAlerts();
  const { toggleStatus } = useToggleTaskStatus();

  // Filter tasks by priority for upcoming deadlines
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (priorityFilter === "all") return tasks.filter(t => t.status === "pending");
    return tasks.filter(t => t.status === "pending" && t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  const handleToggleTaskStatus = (task: Task) => {
    toggleStatus(task);
  };

  const openCompleteConfirmation = (task: Task) => {
    setCompletingTask(task);
    setCompleteOpen(true);
  };

  const handleComplete = () => {
    if (completingTask) {
      toggleStatus(completingTask);
      setCompleteOpen(false);
      setCompletingTask(null);
    }
  };

  const statsData = [
    { label: "Total Tasks", value: stats?.total || 0, colorClass: "text-foreground" },
    { label: "Pending", value: stats?.pending || 0, colorClass: "text-warning" },
    { label: "Completed", value: stats?.completed || 0, colorClass: "text-success" },
    { label: "Overdue", value: stats?.overdue || 0, colorClass: "text-destructive" },
  ];


  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto animate-fade-in flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error loading tasks</h2>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your compliance status.</p>
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsData.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-heading font-semibold mt-1 ${stat.colorClass}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {alerts && alerts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              You have {alerts.length} notification{alerts.length > 1 ? 's' : ''}. Check the bell icon in the header.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Upcoming Deadlines</h2>
            </div>
            <span className="text-xs text-muted-foreground">Latest first</span>
          </div>
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <div key={task.id} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-accent/50 transition-colors">
                <span className="text-foreground">{task.type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground hidden md:block">{task.due_date}</span>
                  {task.notes && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                          <FileText className="h-3 w-3" />
                          <span className="text-xs hidden sm:inline">Notes</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{task.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === "high" ? "bg-destructive/10 text-destructive" :
                    task.priority === "medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCompleteConfirmation(task)}
                    className="text-xs"
                  >
                    Complete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Confirmation Dialog */}
        <Dialog open={completeOpen} onOpenChange={(o) => { setCompleteOpen(o); if (!o) setCompletingTask(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Completion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to mark the task "<span className="font-medium text-foreground">{completingTask?.type}</span>" as completed?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete}>
                Mark as Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </TooltipProvider>
    </AppLayout>
  );
};

export default DashboardPage;
