import { useState, useEffect } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export interface UseServerPaginationOptions {
  /** Initial page size (default: DEFAULT_PAGE_SIZE) */
  pageSize?: number;
  /** Reset page to 0 when this value changes */
  resetKey?: string | number;
}

export interface UseServerPaginationResult {
  /** Current page index (0-based) */
  pageIndex: number;
  /** Current page size */
  pageSize: number;
  /** Set page index */
  setPageIndex: (index: number) => void;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Query parameters for server-side pagination */
  queryParams: {
    pageIndex: number;
    pageSize: number;
  };
}

/**
 * Hook for server-side pagination that provides query parameters
 * and handles page state management with reset functionality
 */
export function useServerPagination(options: UseServerPaginationOptions = {}): UseServerPaginationResult {
  const { pageSize = DEFAULT_PAGE_SIZE, resetKey } = options;
  const [pageIndex, setPageIndex] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Reset page to 0 when resetKey changes
  useEffect(() => {
    setPageIndex(0);
  }, [resetKey]);

  // Reset page to 0 when page size changes
  useEffect(() => {
    setPageIndex(0);
  }, [currentPageSize]);

  const setPageSize = (newSize: number) => {
    const size = Math.max(1, newSize);
    setCurrentPageSize(size);
  };

  return {
    pageIndex,
    pageSize: currentPageSize,
    setPageIndex,
    setPageSize,
    queryParams: {
      pageIndex,
      pageSize: currentPageSize,
    },
  };
}
