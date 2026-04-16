import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CheckCircle, Edit, Trash2, Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { validateAlphabeticText, isValidAlphabeticInput } from "@/lib/formValidation";

type Filter = "all" | "pending" | "completed" | "overdue";

interface Task {
  id: number;
  type: string;
  due: string;
  priority: string;
  status: string;
  notes?: string;
}

const emptyForm = { type: "", due: "", priority: "", notes: "" };

interface TaskFormProps {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: () => void;
  submitLabel: string;
  errors?: { type?: string; due?: string; priority?: string };
  onFieldChange?: (field: string) => void;
}

const TaskForm = ({ form, setForm, onSubmit, submitLabel, errors = {}, onFieldChange }: TaskFormProps) => (
  <div className="space-y-4 mt-2">
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Task Type <span className="text-destructive">*</span>
      </Label>
      <Input 
        placeholder="e.g., Trade License Renewal" 
        value={form.type} 
        onChange={(e) => {
          const value = e.target.value;
          if (isValidAlphabeticInput(value)) {
            setForm((p) => ({ ...p, type: validateAlphabeticText(value) }));
            onFieldChange?.('type');
          }
        }} 
        maxLength={100} 
        className={errors.type ? "border-destructive" : ""}
      />
      {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Due Date <span className="text-destructive">*</span>
      </Label>
      <Input 
        type="date" 
        value={form.due} 
        onChange={(e) => {
          setForm((p) => ({ ...p, due: e.target.value }));
          onFieldChange?.('due');
        }}
        className={errors.due ? "border-destructive" : ""}
      />
      {errors.due && <p className="text-xs text-destructive">{errors.due}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Priority <span className="text-destructive">*</span>
      </Label>
      <Select 
        value={form.priority} 
        onValueChange={(v) => {
          setForm((p) => ({ ...p, priority: v }));
          onFieldChange?.('priority');
        }}
      >
        <SelectTrigger className={errors.priority ? "border-destructive" : ""}>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
        </SelectContent>
      </Select>
      {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
    </div>
    <div className="space-y-2">
      <Label>Notes</Label>
      <Textarea 
        placeholder="Additional notes..." 
        value={form.notes} 
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} 
        maxLength={500} 
      />
    </div>
    <Button className="w-full" onClick={onSubmit}>{submitLabel}</Button>
  </div>
);

const CompliancePage = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ type?: string; due?: string; priority?: string }>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const filtered = tasks.filter((t) => {
    if (filter !== "all" && t.status.toLowerCase() !== filter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search && !t.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Completed", value: "completed" },
    { label: "Overdue", value: "overdue" },
  ];

  const validateForm = () => {
    const newErrors: { type?: string; due?: string; priority?: string } = {};
    
    if (!form.type.trim()) {
      newErrors.type = "Task type is required";
    }
    
    if (!form.due) {
      newErrors.due = "Due date is required";
    }
    
    if (!form.priority) {
      newErrors.priority = "Priority is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const newTask: Task = {
      id: Date.now(),
      type: form.type.trim(),
      due: form.due,
      priority: form.priority,
      status: "Pending",
      notes: form.notes,
    };
    setTasks((prev) => [...prev, newTask]);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: "Task added", description: `"${newTask.type}" has been created.` });
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({ type: task.type, due: task.due, priority: task.priority, notes: task.notes || "" });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingId || !validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingId ? { ...t, type: form.type.trim(), due: form.due, priority: form.priority, notes: form.notes } : t
      )
    );
    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    toast({ title: "Task updated", description: "Changes have been saved." });
  };

  const markComplete = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Completed" } : t)));
    toast({ title: "Task completed" });
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Task deleted" });
  };

  
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Compliance Tasks</h1>
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Compliance Task</DialogTitle></DialogHeader>
              <TaskForm form={form} setForm={setForm} onSubmit={handleAdd} submitLabel="Add Task" errors={errors} onFieldChange={clearFieldError} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1.5 mb-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === f.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Due Date</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Priority</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tasks found.</td></tr>
                ) : (
                  filtered.map((task) => (
                    <tr key={task.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground">{task.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{task.due}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.priority === "High" ? "bg-destructive/10 text-destructive" :
                          task.priority === "Medium" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === "Completed" ? "bg-success/10 text-success" :
                          task.status === "Overdue" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>{task.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(task)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {task.status !== "Completed" && (
                            <button onClick={() => markComplete(task.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-accent transition-colors">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
            <TaskForm form={form} setForm={setForm} onSubmit={handleEdit} submitLabel="Save Changes" errors={errors} onFieldChange={clearFieldError} />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CompliancePage;
