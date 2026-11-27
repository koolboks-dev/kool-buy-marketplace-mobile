import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { errorMessage } from '@/lib/api';

/**
 * Keep the latest callback in a ref without touching the ref during render
 * (React Compiler rule).
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

interface AsyncState<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Load data once (and again when `deps` change), with pull-to-refresh support.
 * `loading` is derived: true until a result for the current deps arrives.
 *
 *   const { data, loading, error, refreshing, refresh } = useAsync(() => listBuyerOrders(), []);
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { skip?: boolean } = {}) {
  const key = JSON.stringify([...deps, Boolean(opts.skip)]);
  const [state, setState] = useState<AsyncState<T>>({ key: null, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useLatest(fn);
  const keyRef = useLatest(key);

  useEffect(() => {
    if (opts.skip) return;
    let alive = true;
    fnRef.current().then(
      (data) => alive && setState({ key, data, error: null }),
      (err) => alive && setState((s) => ({ key, data: s.data, error: errorMessage(err, 'Could not load this page.') })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fetchNow = useCallback(async () => {
    const k = keyRef.current;
    try {
      const data = await fnRef.current();
      setState({ key: k, data, error: null });
    } catch (err) {
      setState((s) => ({ key: k, data: s.data, error: errorMessage(err, 'Could not load this page.') }));
    }
  }, [fnRef, keyRef]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNow();
    setRefreshing(false);
  }, [fetchNow]);

  const setData: Dispatch<SetStateAction<T | null>> = useCallback(
    (next) => setState((s) => ({ ...s, data: typeof next === 'function' ? (next as (prev: T | null) => T | null)(s.data) : next })),
    [],
  );

  return {
    data: state.data,
    setData,
    loading: !opts.skip && state.key !== key,
    refreshing,
    error: state.key === key ? state.error : null,
    refresh,
    reload: fetchNow,
  };
}

interface PagedState<T> {
  key: string | null;
  items: T[];
  page: number;
  hasNext: boolean;
  total?: number;
  error: string | null;
}

/**
 * Paged list with "load more": `fetchPage(page)` returns { items, hasNext }.
 */
export function usePaged<T>(fetchPage: (page: number) => Promise<{ items: T[]; hasNext: boolean; total?: number }>, deps: unknown[] = []) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<PagedState<T>>({ key: null, items: [], page: 1, hasNext: false, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useLatest(fetchPage);
  const keyRef = useLatest(key);

  useEffect(() => {
    let alive = true;
    fnRef.current(1).then(
      (res) => alive && setState({ key, items: res.items, page: 1, hasNext: res.hasNext, total: res.total, error: null }),
      (err) => alive && setState({ key, items: [], page: 1, hasNext: false, error: errorMessage(err, 'Could not load this list.') }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(async () => {
    const k = keyRef.current;
    setRefreshing(true);
    try {
      const res = await fnRef.current(1);
      setState({ key: k, items: res.items, page: 1, hasNext: res.hasNext, total: res.total, error: null });
    } catch (err) {
      setState((s) => ({ ...s, key: k, error: errorMessage(err, 'Could not load this list.') }));
    } finally {
      setRefreshing(false);
    }
  }, [fnRef, keyRef]);

  const loading = state.key !== key;

  const loadMore = useCallback(async () => {
    if (!state.hasNext || loadingMore || loading) return;
    const k = keyRef.current;
    setLoadingMore(true);
    try {
      const next = state.page + 1;
      const res = await fnRef.current(next);
      setState((s) => (s.key === k ? { ...s, items: [...s.items, ...res.items], hasNext: res.hasNext, page: next } : s));
    } catch (err) {
      setState((s) => ({ ...s, error: errorMessage(err) }));
    } finally {
      setLoadingMore(false);
    }
  }, [state.hasNext, state.page, loadingMore, loading, fnRef, keyRef]);

  const setItems: Dispatch<SetStateAction<T[]>> = useCallback(
    (next) => setState((s) => ({ ...s, items: typeof next === 'function' ? (next as (prev: T[]) => T[])(s.items) : next })),
    [],
  );

  return {
    items: loading ? [] : state.items,
    setItems,
    total: loading ? undefined : state.total,
    hasNext: state.hasNext,
    loading,
    loadingMore,
    refreshing,
    error: loading ? null : state.error,
    refresh,
    loadMore,
  };
}
