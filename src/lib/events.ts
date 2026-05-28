"use client";

import { useEffect } from "react";

const EVENT = "fin:data-changed";

/** Call after any mutation (create/edit/delete/import) so metric pages refresh. */
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

/**
 * Re-runs `onRefresh` whenever data changes anywhere in the app, when the tab
 * regains focus, or when it becomes visible again. Keeps metrics always fresh.
 * `onRefresh` should be stable (wrap in useCallback).
 */
export function useAutoRefresh(onRefresh: () => void) {
  useEffect(() => {
    const handler = () => onRefresh();
    const onFocus = () => onRefresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") onRefresh();
    };

    window.addEventListener(EVENT, handler);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onRefresh]);
}
