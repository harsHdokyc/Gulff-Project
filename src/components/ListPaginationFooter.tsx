import { Button } from "@/components/ui/button";
import { getPaginationDerived } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type ListPaginationFooterProps = {
  total: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (nextPageIndex: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Footer row: range summary, page X of Y, Previous / Next.
 * Same pattern as Documents list pagination.
 */
export function ListPaginationFooter({
  total,
  pageIndex,
  pageSize,
  onPageChange,
  disabled = false,
  className,
}: ListPaginationFooterProps) {
  const { pageCount, rangeStart, rangeEnd, canPrev, canNext } = getPaginationDerived(
    total,
    pageIndex,
    pageSize
  );

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "No results"
          : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        {pageCount > 1 ? ` · Page ${pageIndex + 1} of ${pageCount}` : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev || disabled}
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext || disabled}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
