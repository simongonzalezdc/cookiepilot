import { useEffect, useRef, useState } from "react";

export interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

/** Poll an async fetcher on an interval, with manual refresh + live error capture. */
export function usePoll<T>(fn: () => Promise<T>, intervalMs: number, deps: unknown[] = []): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      setLoading(true);
      try {
        const d = await fnRef.current();
        if (!alive) return;
        setData(d);
        setError(null);
        setLastUpdated(Date.now());
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
        timer = setTimeout(run, intervalMs);
      }
    };
    void run();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, nonce, ...deps]);

  return { data, error, loading, lastUpdated, refresh: () => setNonce((n) => n + 1) };
}
