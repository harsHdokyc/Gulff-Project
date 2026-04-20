import type { Task } from "@/modules/dashboard/services/dashboardTasks";
import type { Document } from "@/modules/documents/services/documentService";

export type DeadlineRow =
  | { kind: "task"; task: Task }
  | { kind: "document"; doc: Document };

function deadlineSortKey(dateStr: string | undefined): number {
  return dateStr ? new Date(dateStr).getTime() : Number.POSITIVE_INFINITY;
}

/** Pending tasks + upcoming documents, sorted soonest deadline first. */
export function mergeUpcomingDeadlineRows(tasks: Task[], documents: Document[]): DeadlineRow[] {
  const scored = [
    ...tasks.map((task) => ({
      row: { kind: "task" as const, task },
      at: deadlineSortKey(task.due_date),
    })),
    ...documents.map((doc) => ({
      row: { kind: "document" as const, doc },
      at: deadlineSortKey(doc.expiry_date),
    })),
  ];
  scored.sort((a, b) => a.at - b.at);
  return scored.map((s) => s.row);
}
