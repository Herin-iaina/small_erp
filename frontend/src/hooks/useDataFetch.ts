import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginatedResponse } from "@/types/api";

interface UseDataFetchOptions<P extends Record<string, unknown>> {
  fetchFn: (params: P) => Promise<PaginatedResponse<unknown>>;
  initialParams: P;
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function useDataFetch<T, P extends Record<string, unknown>>({
  fetchFn,
  initialParams,
}: UseDataFetchOptions<P>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams.page as number ?? 1);
  const [pageSize] = useState(initialParams.page_size as number ?? 20);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [params, setParamsState] = useState<P>(initialParams);

  // Use ref for fetchFn to avoid re-creating fetchData on every render
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(async (p: P) => {
    setLoading(true);
    try {
      const result = await (fetchFnRef.current as (params: P) => Promise<PaginatedResponse<T>>)(p);
      setData(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setData([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData({ ...params, page, page_size: pageSize } as P);
  }, [fetchData, params, page, pageSize]);

  const setParams = useCallback((newParams: Partial<P>) => {
    setParamsState((prev) => {
      const next = { ...prev, ...newParams };
      if (shallowEqual(prev, next)) return prev;
      return next;
    });
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchData({ ...params, page, page_size: pageSize } as P);
  }, [fetchData, params, page, pageSize]);

  return {
    data,
    total,
    page,
    pageSize,
    pages,
    loading,
    params,
    setParams,
    setPage,
    refresh,
  };
}
