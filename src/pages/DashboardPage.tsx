import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Task {
  type: string;
  due: string;
  priority: string;
  status: string;
  notes?: string;
}

const initialTasks: Task[] = [
  { type: "Trade License Renewal", due: "2024-03-15", priority: "High", status: "Pending" },
  { type: "VAT Filing Q1", due: "2024-03-31", priority: "Medium", status: "Pending" },
  { type: "Employee Visa – Ahmed", due: "2024-04-02", priority: "High", status: "Pending" },
  { type: "Insurance Renewal", due: "2024-04-10", priority: "Low", status: "Pending" },
  { type: "Annual Audit", due: "2024-04-30", priority: "Medium", status: "Pending" },
];

const alerts = [
  { message: "Trade License Renewal is overdue", type: "danger" as const },
  { message: "Employee Visa expiring in 7 days – Ahmed", type: "warning" as const },
];

const DashboardPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState({ type: "", due: "", priority: "", notes: "" });

  const handleAddTask = () => {
    if (!newTask.type.trim() || !newTask.due || !newTask.priority) {
      toast({ title: "Missing fields", description: "Please fill in task type, due date, and priority.", variant: "destructive" });
      return;
    }
    setTasks((prev) => [...prev, { ...newTask, status: "Pending" }]);
    setNewTask({ type: "", due: "", priority: "", notes: "" });
    setDialogOpen(false);
    toast({ title: "Task added", description: `"${newTask.type}" has been added to your tasks.` });
  };

  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = tasks.filter((t) => t.status === "Pending").length;
  const overdue = tasks.filter((t) => t.status === "Overdue").length;

  const statsData = [
    { label: "Total Tasks", value: tasks.length, colorClass: "text-foreground" },
    { label: "Pending", value: pending, colorClass: "text-warning" },
    { label: "Completed", value: completed, colorClass: "text-success" },
    { label: "Overdue", value: overdue, colorClass: "text-destructive" },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your compliance status.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Compliance Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Input
                    placeholder="e.g., Trade License Renewal"
                    value={newTask.type}
                    onChange={(e) => setNewTask((p) => ({ ...p, type: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due}
                    onChange={(e) => setNewTask((p) => ({ ...p, due: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={newTask.notes}
                    onChange={(e) => setNewTask((p) => ({ ...p, notes: e.target.value }))}
                    maxLength={500}
                  />
                </div>
                <Button className="w-full" onClick={handleAddTask}>Add Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsData.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-heading font-semibold mt-1 ${stat.colorClass}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                  alert.type === "danger"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-warning/30 bg-warning/5 text-warning"
                }`}
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Upcoming Deadlines</h2>
          </div>
          <div className="divide-y divide-border">
            {tasks.filter((t) => t.status === "Pending").map((task, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-accent/50 transition-colors">
                <span className="text-foreground">{task.type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground hidden md:block">{task.due}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === "High" ? "bg-destructive/10 text-destructive" :
                    task.priority === "Medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
