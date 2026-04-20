import { useState, useMemo, useCallback } from "react";
import { usePaginationSync } from "@/hooks/usePaginationSync";
import { DEFAULT_PAGE_SIZE, slicePage, getPaginationDerived } from "@/lib/pagination";

export interface UsePaginationOptions {
  /** Initial page size (default: DEFAULT_PAGE_SIZE) */
  pageSize?: number;
  /** Reset page to 0 when this value changes */
  resetKey?: string | number;
}

export interface UsePaginationResult<T> {
  /** Current page index (0-based) */
  pageIndex: number;
  /** Current page size */
  pageSize: number;
  /** Set page index */
  setPageIndex: (index: number) => void;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Current page data (for client-side pagination) */
  currentPageData: T[];
  /** Pagination metadata */
  pagination: {
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
    canPrev: boolean;
    canNext: boolean;
  };
  /** Check if an item is on current page (for server-side pagination) */
  isItemOnCurrentPage: (itemIndex: number) => boolean;
}

/**
 * Centralized pagination hook that works for both client-side and server-side pagination
 * 
 * @param data - Array of items (for client-side pagination) or total count (for server-side)
 * @param options - Pagination configuration
 * @returns Pagination controls and metadata
 */
export function usePagination<T>(
  data: T[] | number,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize = DEFAULT_PAGE_SIZE, resetKey } = options;
  const [pageIndex, setPageIndex] = useState(0);

  // Determine if we're dealing with client-side data or server-side total count
  const isClientSide = Array.isArray(data);
  const total = isClientSide ? data.length : data;
  const items = isClientSide ? data : [];

  // Sync pagination with data changes
  usePaginationSync(setPageIndex, total, pageSize, resetKey);

  // Calculate current page data for client-side pagination
  const currentPageData = useMemo(() => {
    if (!isClientSide) return [] as T[];
    return slicePage(items, pageIndex, pageSize);
  }, [items, pageIndex, pageSize, isClientSide]);

  // Calculate pagination metadata
  const pagination = useMemo(() => {
    return getPaginationDerived(total, pageIndex, pageSize);
  }, [total, pageIndex, pageSize]);

  // Pagination controls
  const nextPage = useCallback(() => {
    if (pagination.canNext) {
      setPageIndex(pageIndex + 1);
    }
  }, [pageIndex, pagination.canNext]);

  const prevPage = useCallback(() => {
    if (pagination.canPrev) {
      setPageIndex(Math.max(0, pageIndex - 1));
    }
  }, [pageIndex, pagination.canPrev]);

  const firstPage = useCallback(() => {
    setPageIndex(0);
  }, []);

  const lastPage = useCallback(() => {
    const lastIdx = Math.max(0, pagination.pageCount - 1);
    setPageIndex(lastIdx);
  }, [pagination.pageCount]);

  const setPageSize = useCallback((newSize: number) => {
    const size = Math.max(1, newSize);
    setPageIndex(0); // Reset to first page when changing page size
  }, []);

  // Check if an item is on current page (useful for server-side pagination)
  const isItemOnCurrentPage = useCallback((itemIndex: number) => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return itemIndex >= start && itemIndex < end;
  }, [pageIndex, pageSize]);

  return {
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    currentPageData,
    pagination: {
      ...pagination,
      total,
    },
    isItemOnCurrentPage,
  };
}
