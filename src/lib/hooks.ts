import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type TeamdexEvent } from './api';

/** Loads async data, retrying up to 3 times on failure (flaky venue Wi-Fi). */
export function useData<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const my = ++seq.current;
    if (!quiet) setLoading(true);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const v = await fnRef.current();
        if (my !== seq.current) return;
        setData(v);
        setError(null);
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 3) {
          if (my !== seq.current) return;
          setError(e as Error);
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => load(true), [load]);
  return { data, error, loading: loading && data === undefined, reload, setData };
}

/** Subscribe to the company's live event stream. */
export function useLiveEvents(companyId: string | undefined, onEvent: (e: TeamdexEvent) => void) {
  const ref = useRef(onEvent);
  ref.current = onEvent;
  useEffect(() => {
    if (!companyId) return;
    return api.subscribeEvents(companyId, (e) => ref.current(e));
  }, [companyId]);
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
