import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UsePaginationResult } from "@/hooks/usePagination";

interface PaginationProps {
  pagination: UsePaginationResult<any>["pagination"];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
  className?: string;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className,
  showPageSizeSelector = true,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const { total, pageCount, rangeStart, rangeEnd, canPrev, canNext } = pagination;

  if (total === 0) {
    return (
      <div className={cn("flex items-center justify-between", className)}>
        <p className="text-sm text-muted-foreground">No results</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {rangeStart}-{rangeEnd} of {total}
        {pageCount > 1 ? ` · Page ${Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) + 1} of ${pageCount}` : null}
      </p>
      
      <div className="flex items-center gap-2">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={String(rangeEnd - rangeStart + 1)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev || disabled}
            onClick={() => onPageChange(Math.max(0, Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) - 1))}
          >
            Previous
          </Button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              let pageNum;
              const currentPage = Math.floor(rangeStart / (rangeEnd - rangeStart + 1));
              
              if (pageCount <= 5) {
                pageNum = i;
              } else if (currentPage <= 2) {
                pageNum = i;
              } else if (currentPage >= pageCount - 3) {
                pageNum = pageCount - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  type="button"
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext || disabled}
            onClick={() => onPageChange(Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple pagination component (backward compatibility)
export function SimplePagination({
  pagination,
  onPageChange,
  disabled = false,
  className,
}: {
  pagination: UsePaginationResult<any>["pagination"];
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { total, pageCount, rangeStart, rangeEnd, canPrev, canNext } = pagination;

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
          : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
        {pageCount > 1 ? ` · Page ${Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) + 1} of ${pageCount}` : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev || disabled}
          onClick={() => onPageChange(Math.max(0, Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext || disabled}
          onClick={() => onPageChange(Math.floor(rangeStart / (rangeEnd - rangeStart + 1)) + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
