import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { CheckCircle, Edit, Trash2, Search, Plus, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { validateAlphabeticText, isValidAlphabeticInput, getMinDate } from "@/modules/auth/services/formValidation";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from "@/modules/dashboard/hooks/useDashboardTasksQuery";
import { Task } from "@/modules/dashboard/services/dashboardTasks";
import { SimplePagination } from "@/components/Pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useDeferredValue } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper function to truncate text
const truncateText = (text: string, maxLength: number = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const emptyForm = { type: "", due_date: "", priority: "", notes: "" };

interface TaskFormProps {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: () => void;
  submitLabel: string;
  errors?: { type?: string; due_date?: string; priority?: string };
  onFieldChange?: (field: string) => void;
  isLoading?: boolean;
}

const TaskForm = ({ form, setForm, onSubmit, submitLabel, errors = {}, onFieldChange, isLoading = false }: TaskFormProps) => (
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
        value={form.due_date} 
        onChange={(e) => {
          setForm((p) => ({ ...p, due_date: e.target.value }));
          onFieldChange?.('due_date');
        }} 
        className={errors.due_date ? "border-destructive" : ""}
        min={getMinDate()}
      />
      {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
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
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
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
    <Button className="w-full" onClick={onSubmit} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      {submitLabel}
    </Button>
  </div>
);

const CompliancePage = () => {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  
  // Type-safe wrapper for setStatusFilter
  const handleStatusFilterChange = (value: string) => {
    if (value === "all" || value === "pending" || value === "completed" || value === "overdue") {
      setStatusFilter(value);
    }
  };
  
  const [priorityFilter, setPriorityFilter] = useState("all");
  
  // Type-safe wrapper for setPriorityFilter
  const handlePriorityFilterChange = (value: string) => {
    if (value === "all" || value === "high" || value === "medium" || value === "low") {
      setPriorityFilter(value);
    }
  };
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ type?: string; due_date?: string; priority?: string }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const pagination = useServerPagination({
    pageSize: DEFAULT_PAGE_SIZE,
    resetKey: `${statusFilter}|${priorityFilter}|${deferredSearch}`,
  });

  const { tasks, isLoading, error, isFetching } = useTasks({
    ...pagination.queryParams,
    search: deferredSearch,
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toggleStatus } = useToggleTaskStatus();

  const total = tasks?.length ?? 0;

  const statusFilters: { label: string; value: "all" | "pending" | "completed" | "overdue" }[] = [
    { label: "All", value: "all" as const },
    { label: "Pending", value: "pending" as const },
    { label: "Completed", value: "completed" as const },
    { label: "Overdue", value: "overdue" as const },
  ];

  const priorityFilters: { label: string; value: "all" | "high" | "medium" | "low" }[] = [
    { label: "All Priorities", value: "all" as const },
    { label: "High", value: "high" as const },
    { label: "Medium", value: "medium" as const },
    { label: "Low", value: "low" as const },
  ];

  const validateForm = () => {
    const newErrors: { type?: string; due_date?: string; priority?: string } = {};
    
    if (!form.type.trim()) {
      newErrors.type = "Task type is required";
    }
    
    if (!form.due_date) {
      newErrors.due_date = "Due date is required";
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
    
    createTask.mutate({
      type: form.type.trim(),
      due_date: form.due_date,
      priority: form.priority as 'low' | 'medium' | 'high',
      notes: form.notes || undefined
    });
    
    setForm(emptyForm);
    setAddOpen(false);
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({ 
      type: task.type, 
      due_date: task.due_date, 
      priority: task.priority, 
      notes: task.notes || "" 
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingId || !validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    
    updateTask.mutate({
      id: editingId,
      updates: {
        type: form.type.trim(),
        due_date: form.due_date,
        priority: form.priority as 'low' | 'medium' | 'high',
        notes: form.notes || undefined
      }
    });
    
    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  const openDeleteConfirmation = (task: Task) => {
    setDeletingTask(task);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (deletingTask) {
      deleteTask.mutate(deletingTask.id);
      setDeleteOpen(false);
      setDeletingTask(null);
    }
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
          <h1 className="font-heading text-2xl font-semibold text-foreground">Compliance Tasks ({total})</h1>
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
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={handlePriorityFilterChange}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityFilters.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isFetching && !isLoading && (
            <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center justify-end">
              <span className="text-xs font-normal text-muted-foreground">Updating...</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Type</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Due Date</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Priority</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Status</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Notes</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium w-[16.67%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading tasks...</td></tr>
                ) : tasks && tasks.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No tasks found.</td></tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground w-[16.67%]">{task.type}</td>
                      <td className="px-4 py-3 text-muted-foreground w-[16.67%]">{task.due_date}</td>
                      <td className="px-4 py-3 w-[16.67%]">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.priority === "high" ? "bg-destructive/10 text-destructive" :
                          task.priority === "medium" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                      </td>
                      <td className="px-4 py-3 w-[16.67%]">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === "completed" ? "bg-success/10 text-success" :
                          task.status === "overdue" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>{task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
                      </td>
                      <td className="px-4 py-3 w-[16.67%]">
                        {task.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors max-w-[200px] truncate block">
                                {truncateText(task.notes)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{task.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">No notes</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right w-[16.67%]">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEdit(task)} 
                            disabled={task.status === "completed"}
                            className={`p-1.5 rounded-md transition-colors ${
                              task.status === "completed" 
                                ? "text-muted-foreground/50 cursor-not-allowed" 
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            }`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {task.status !== "completed" && (
                            <button onClick={() => openCompleteConfirmation(task)} className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-accent transition-colors">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => openDeleteConfirmation(task)} 
                            disabled={task.status === "completed"}
                            className={`p-1.5 rounded-md transition-colors ${
                              task.status === "completed" 
                                ? "text-muted-foreground/50 cursor-not-allowed" 
                                : "text-muted-foreground hover:text-destructive hover:bg-accent"
                            }`}
                          >
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

        <SimplePagination
          pagination={{
            total,
            pageCount: Math.ceil(total / pagination.pageSize),
            rangeStart: total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1,
            rangeEnd: Math.min((pagination.pageIndex + 1) * pagination.pageSize, total),
            canPrev: pagination.pageIndex > 0,
            canNext: (pagination.pageIndex + 1) * pagination.pageSize < total,
          }}
          onPageChange={pagination.setPageIndex}
          disabled={isFetching}
        />

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
            <TaskForm form={form} setForm={setForm} onSubmit={handleEdit} submitLabel="Save Changes" errors={errors} onFieldChange={clearFieldError} />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeletingTask(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the task "<span className="font-medium text-foreground">{deletingTask?.type}</span>"?
              </p>
              <p className="text-xs text-destructive mt-2">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

export default CompliancePage;
