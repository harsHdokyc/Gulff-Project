import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, FileText, FileCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
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

// Helper function to truncate text
const truncateText = (text: string, maxLength: number = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/** Dashboard deadlines omit completed documents entirely. */
const DASHBOARD_DOCUMENT_STATUS_OPTIONS = DOCUMENT_STATUS_FILTER_OPTIONS.filter(
  (opt) => opt.value !== DOCUMENT_STATUS_LABELS.complete
);

const DashboardPage = () => {
  const { t } = useTranslation();
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
    if (deferredPriorityFilter === "all") return tasks.filter(t => t.status === "pending" || t.status === "overdue");
    return tasks.filter(t => (t.status === "pending" || t.status === "overdue") && t.priority === deferredPriorityFilter);
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
      label: t('dashboard.totalTasks'), 
      value: (taskStats?.total || 0) + (documentSummary?.stats.total || 0), 
      colorClass: "text-foreground" 
    },
    { 
      label: t('dashboard.pendingActive'), 
      value: (taskStats?.pending || 0) + (documentSummary?.stats.active || 0), 
      colorClass: "text-warning" 
    },
    { 
      label: t('common.completed'), 
      value: (taskStats?.completed || 0) + (documentSummary?.stats.complete || 0), 
      colorClass: "text-success" 
    },
    { 
      label: t('dashboard.overdueExpiringExpired'), 
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
            <h2 className="text-lg font-semibold text-destructive mb-2">{t('dashboard.errorLoadingTasks')}</h2>
            <p className="text-muted-foreground">{t('dashboard.pleaseTryRefreshingPage')}</p>
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
            <h1 className="font-heading text-2xl font-semibold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 w-full sm:w-auto">
            <div className="space-y-1 w-full sm:w-44">
              <span className="text-xs text-muted-foreground">{t('dashboard.complianceTasks')}</span>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.allPriorities')}</SelectItem>
                  <SelectItem value="high">{t('common.high')}</SelectItem>
                  <SelectItem value="medium">{t('common.medium')}</SelectItem>
                  <SelectItem value="low">{t('common.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-full sm:w-44">
              <span className="text-xs text-muted-foreground">{t('dashboard.documents')}</span>
              <Select value={documentStatusFilter} onValueChange={setDocumentStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.status')} />
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
              {t('dashboard.youHaveNotifications', { count: (taskAlerts?.length || 0) + (documentAlerts?.length || 0), plural: ((taskAlerts?.length || 0) + (documentAlerts?.length || 0)) > 1 ? 's' : '' })}
            </p>
          </div>
        )}

        
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">{t('dashboard.upcomingDeadlines')}</h2>
            </div>
            <span className="text-xs text-muted-foreground">{t('dashboard.soonestFirst')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[25%]">{t('dashboard.type')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[25%]">{t('dashboard.dueDate')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[25%]">{t('common.status')}</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium w-[25%]">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedDeadlines.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dashboard.noTasksOrDocumentsMatch')}</td></tr>
                ) : (
                  paginatedDeadlines.map((row) =>
                    row.kind === "task" ? (
                      <tr key={`task-${row.task.id}`} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-foreground w-[25%]">{row.task.type}</td>
                        <td className="px-4 py-3 text-muted-foreground w-[25%]">{row.task.due_date}</td>
                        <td className="px-4 py-3 w-[25%]">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            row.task.status === "completed" ? "bg-success/10 text-success" :
                            row.task.status === "overdue" ? "bg-destructive/10 text-destructive" :
                            "bg-warning/10 text-warning"
                          }`}>{row.task.status.charAt(0).toUpperCase() + row.task.status.slice(1)}</span>
                        </td>
                        <td className="px-4 py-3 text-right w-[25%]">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCompleteConfirmation(row.task)}
                              disabled={row.task.status === "completed"}
                              className={`text-xs ${
                                row.task.status === "completed" 
                                  ? "text-muted-foreground/50 cursor-not-allowed" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                            >
                              {t('dashboard.complete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={`doc-${row.doc.id}`} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-foreground w-[25%]">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-3 w-3 text-muted-foreground" />
                            <span>{row.doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground w-[25%]">{row.doc.expiry_date || t('dashboard.noExpiry')}</td>
                        <td className="px-4 py-3 w-[25%]">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${documentStatusBadgeClass(row.doc.status)}`}>
                            {documentStatusLabel(row.doc.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right w-[25%]">
                          <div className="flex items-center justify-end gap-1">
                            {row.doc.status !== "complete" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocumentCompleteConfirmation(row.doc)}
                                className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                {t('dashboard.complete')}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
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
              <DialogTitle>{t('dashboard.confirmCompletion')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.areYouSureMarkTaskComplete')} "{completingTask?.type}" {t('dashboard.asCompleted')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleComplete}>
                {t('dashboard.markAsComplete')}
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
              <DialogTitle>{t('dashboard.confirmCompletion')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.areYouSureMarkDocumentComplete')} "{completingDoc?.name}" {t('dashboard.asCompleted')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocumentCompleteOpen(false)}>
                {t('dashboard.cancel')}
              </Button>
              <Button onClick={handleDocumentComplete} disabled={markDocumentComplete.isPending}>
                {t('dashboard.markAsComplete')}
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
