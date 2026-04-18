/** Default page size used across list views (Documents, Dashboard deadlines, etc.). */
export const DEFAULT_PAGE_SIZE = 10;

/** Highest valid page index for `total` items (0-based). */
export function lastPageIndex(total: number, pageSize: number): number {
  const size = Math.max(1, pageSize);
  return Math.max(0, Math.ceil(total / size) - 1);
}

/** One page of a preloaded array (client-side paging). */
export function slicePage<T>(items: readonly T[], pageIndex: number, pageSize: number): T[] {
  const size = Math.max(1, pageSize);
  const start = pageIndex * size;
  return items.slice(start, start + size);
}

export function getPaginationDerived(total: number, pageIndex: number, pageSize: number) {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size) || 1);
  const rangeStart = total === 0 ? 0 : pageIndex * size + 1;
  const rangeEnd = Math.min((pageIndex + 1) * size, total);
  const canPrev = pageIndex > 0;
  const canNext = (pageIndex + 1) * size < total;
  return { pageCount, rangeStart, rangeEnd, canPrev, canNext };
}
