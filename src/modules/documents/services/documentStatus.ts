/**
 * Document status is mostly driven by DB `get_document_status` (expiry-based).
 * `complete` is a manual override users set after finishing review; batch jobs skip it.
 */

export type DocumentStatusKey = "active" | "expiring-soon" | "expired" | "complete";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatusKey, string> = {
  active: "Active",
  "expiring-soon": "Expiring Soon",
  expired: "Expired",
  complete: "Complete",
};

/** Filter dropdown: value is the visible label so it matches table cells. */
export const DOCUMENT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Status" },
  ...(
    Object.entries(DOCUMENT_STATUS_LABELS) as [DocumentStatusKey, string][]
  ).map(([key, label]) => ({ value: label, label })),
];

/** Maps status filter dropdown value → DB `documents.status` (`undefined` = no filter). */
export function statusFilterValueToDbStatus(filterValue: string): DocumentStatusKey | undefined {
  if (filterValue === "all") return undefined;
  const found = (Object.entries(DOCUMENT_STATUS_LABELS) as [DocumentStatusKey, string][]).find(
    ([, label]) => label === filterValue
  );
  return found?.[0];
}

function isDocumentStatusKey(s: string): s is DocumentStatusKey {
  return (
    s === "active" ||
    s === "expiring-soon" ||
    s === "expired" ||
    s === "complete"
  );
}

export function documentStatusLabel(status: string): string {
  if (isDocumentStatusKey(status)) return DOCUMENT_STATUS_LABELS[status];
  return "Unknown";
}

export function documentStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-blue-500/10 text-blue-500";
    case "expiring-soon":
      return "bg-warning/10 text-warning";
    case "expired":
      return "bg-destructive/10 text-destructive";
    case "complete":
      return "bg-success/10 text-success";
    default:
      return "bg-muted text-muted-foreground";
  }
}
