import { useEffect, type Dispatch, type SetStateAction } from "react";
import { lastPageIndex } from "@/lib/pagination";

/**
 * Keeps page index valid: resets to 0 when `resetKey` changes, clamps when the list shrinks.
 * Use with `useState` for page index, after the query that supplies `totalItemCount`.
 */
export function usePaginationSync(
  setPageIndex: Dispatch<SetStateAction<number>>,
  totalItemCount: number,
  pageSize: number,
  resetKey: string | number
): void {
  useEffect(() => {
    setPageIndex(0);
  }, [resetKey, setPageIndex]);

  useEffect(() => {
    const maxIdx = lastPageIndex(totalItemCount, pageSize);
    setPageIndex((i) => Math.min(i, maxIdx));
  }, [totalItemCount, pageSize, setPageIndex]);
}
