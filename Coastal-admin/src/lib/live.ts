import { useEffect, useRef } from 'react';

/**
 * Re-runs `callback` in the background on an interval and whenever the tab
 * becomes visible again — keeps admin pages in sync with new bookings and
 * changes made elsewhere without a page reload.
 */
export function useLiveRefresh(callback: () => void | Promise<void>, intervalMs = 20000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (mounted) void cbRef.current();
    };
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const onFocus = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs]);
}
