import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, FileText, FileCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTasks, useTaskStats, useTaskAlerts, useToggleTaskStatus } from "@/modules/dashboard/hooks/useDashboardTasksQuery";
import { useDocumentSummary, useDocumentAlerts } from "@/modules/documents/hooks/useDocumentSummaryQuery";
import { useMarkDocumentComplete } from "@/modules/documents/hooks/useDocumentsQuery";
import {
  DOCUMENT_STATUS_FILTER_OPTIONS,
  DOCUMENT_STATUS_LABELS,
  documentStatusBadgeClass,
  documentStatusLabel,
  statusFilterValueToDbStatus,
} from "@/modules/documents/services/documentStatus";
import type { Document } from "@/modules/documents/services/documentService";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { SimplePagination } from "@/components/Pagination";
import { mergeUpcomingDeadlineRows, type DeadlineRow } from "@/modules/dashboard/services/dashboardDeadlines";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDeferredValue } from "react";
import { Task } from "@/modules/dashboard/services/dashboardTasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Dashboard deadlines omit completed documents entirely. */
const DASHBOARD_DOCUMENT_STATUS_OPTIONS = DOCUMENT_STATUS_FILTER_OPTIONS.filter(
  (opt) => opt.value !== DOCUMENT_STATUS_LABELS.complete
);

const DashboardPage = () => {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("all");
  const deferredPriorityFilter = useDeferredValue(priorityFilter);
  const deferredDocumentStatusFilter = useDeferredValue(documentStatusFilter);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [documentCompleteOpen, setDocumentCompleteOpen] = useState(false);
  const [completingDoc, setCompletingDoc] = useState<Document | null>(null);
  // For dashboard, we'll fetch all tasks and documents and merge them client-side
  // since the pagination needs to work across both data sources
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: documentSummary } = useDocumentSummary();
  const { data: taskStats } = useTaskStats();
  const { data: taskAlerts } = useTaskAlerts();
  const { toggleStatus } = useToggleTaskStatus();
  const { data: documentAlerts } = useDocumentAlerts();
  
  const isLoading = tasksLoading;
  const error = tasksError;
  const markDocumentComplete = useMarkDocumentComplete();
  // Filter tasks by priority for upcoming deadlines
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (deferredPriorityFilter === "all") return tasks.filter(t => t.status === "pending");
    return tasks.filter(t => t.status === "pending" && t.priority === deferredPriorityFilter);
  }, [tasks, deferredPriorityFilter]);

  const filteredDocuments = useMemo(() => {
    const docs = (documentSummary?.documents ?? []).filter((d) => d.status !== "complete");
    const dbStatus = statusFilterValueToDbStatus(deferredDocumentStatusFilter);
    if (!dbStatus) return docs;
    return docs.filter((d) => d.status === dbStatus);
  }, [documentSummary?.documents, deferredDocumentStatusFilter]);

  const mergedDeadlines = useMemo(
    () => mergeUpcomingDeadlineRows(filteredTasks, filteredDocuments),
    [filteredTasks, filteredDocuments]
  );

  const deadlinePagination = useServerPagination({
    pageSize: DEFAULT_PAGE_SIZE,
    resetKey: `${deferredPriorityFilter}|${deferredDocumentStatusFilter}`,
  });

  // Apply client-side pagination to the merged deadlines
  const paginatedDeadlines = useMemo(() => {
    const startIndex = deadlinePagination.pageIndex * deadlinePagination.pageSize;
    const endIndex = startIndex + deadlinePagination.pageSize;
    return mergedDeadlines.slice(startIndex, endIndex);
  }, [mergedDeadlines, deadlinePagination.pageIndex, deadlinePagination.pageSize]);

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

  const openDocumentCompleteConfirmation = (doc: Document) => {
    setCompletingDoc(doc);
    setDocumentCompleteOpen(true);
  };

  const handleDocumentComplete = () => {
    if (completingDoc) {
      markDocumentComplete.mutate(completingDoc.id);
      setDocumentCompleteOpen(false);
      setCompletingDoc(null);
    }
  };

  const statsData = [
    { 
      label: "Total Tasks", 
      value: (taskStats?.total || 0) + (documentSummary?.stats.total || 0), 
      colorClass: "text-foreground" 
    },
    { 
      label: "Pending/Active", 
      value: (taskStats?.pending || 0) + (documentSummary?.stats.active || 0), 
      colorClass: "text-warning" 
    },
    { 
      label: "Completed", 
      value: (taskStats?.completed || 0) + (documentSummary?.stats.complete || 0), 
      colorClass: "text-success" 
    },
    { 
      label: "Overdue/Expiring/Expired", 
      value: (taskStats?.overdue || 0) + (documentSummary?.stats.expiring || 0) + (documentSummary?.stats.expired || 0), 
      colorClass: "text-destructive" 
    },
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your compliance status.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 w-full sm:w-auto">
            <div className="space-y-1 w-full sm:w-44">
              <span className="text-xs text-muted-foreground">Compliance tasks</span>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-full sm:w-44">
              <span className="text-xs text-muted-foreground">Documents</span>
              <Select value={documentStatusFilter} onValueChange={setDocumentStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_DOCUMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsData.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-heading font-semibold mt-1 ${stat.colorClass}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {(taskAlerts && taskAlerts.length > 0) || (documentAlerts && documentAlerts.length > 0) && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              You have {(taskAlerts?.length || 0) + (documentAlerts?.length || 0)} notification{((taskAlerts?.length || 0) + (documentAlerts?.length || 0)) > 1 ? 's' : ''}. Check bell icon in the header.
            </p>
          </div>
        )}

        
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Upcoming Deadlines</h2>
            </div>
            <span className="text-xs text-muted-foreground">Soonest first</span>
          </div>
          <div className="divide-y divide-border">
            {paginatedDeadlines.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tasks or documents match your filters.
              </div>
            ) : (
              paginatedDeadlines.map((row) =>
                row.kind === "task" ? (
                  <div
                    key={`task-${row.task.id}`}
                    className="px-4 py-3 flex items-center justify-between text-sm hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-foreground">{row.task.type}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground hidden md:block">{row.task.due_date}</span>
                      {row.task.notes && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                              <FileText className="h-3 w-3" />
                              <span className="text-xs hidden sm:inline">Notes</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{row.task.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          row.task.priority === "high"
                            ? "bg-destructive/10 text-destructive"
                            : row.task.priority === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.task.priority.charAt(0).toUpperCase() + row.task.priority.slice(1)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCompleteConfirmation(row.task)}
                        className="text-xs"
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`doc-${row.doc.id}`}
                    className="px-4 py-3 flex items-center justify-between text-sm hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground">{row.doc.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground hidden md:block">
                        {row.doc.expiry_date || "No expiry"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${documentStatusBadgeClass(row.doc.status)}`}
                      >
                        {documentStatusLabel(row.doc.status)}
                      </span>
                      {row.doc.status !== "complete" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDocumentCompleteConfirmation(row.doc)}
                          className="text-xs"
                          disabled={markDocumentComplete.isPending}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <SimplePagination
          pagination={{
            total: mergedDeadlines.length,
            pageCount: Math.ceil(mergedDeadlines.length / deadlinePagination.pageSize),
            rangeStart: mergedDeadlines.length === 0 ? 0 : deadlinePagination.pageIndex * deadlinePagination.pageSize + 1,
            rangeEnd: Math.min((deadlinePagination.pageIndex + 1) * deadlinePagination.pageSize, mergedDeadlines.length),
            canPrev: deadlinePagination.pageIndex > 0,
            canNext: (deadlinePagination.pageIndex + 1) * deadlinePagination.pageSize < mergedDeadlines.length,
          }}
          pageIndex={deadlinePagination.pageIndex}
          onPageChange={deadlinePagination.setPageIndex}
          disabled={isLoading}
        />

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

        <Dialog
          open={documentCompleteOpen}
          onOpenChange={(o) => {
            setDocumentCompleteOpen(o);
            if (!o) setCompletingDoc(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Completion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to mark the document "
                <span className="font-medium text-foreground">{completingDoc?.name}</span>" as completed?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocumentCompleteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDocumentComplete} disabled={markDocumentComplete.isPending}>
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
