"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` every `intervalMs` while `enabled` is true — but pauses
 * whenever the tab is backgrounded (so we don't keep hammering the free-tier
 * API from a hidden tab) and fires once immediately on becoming visible again.
 *
 * `callback` is held in a ref so the interval isn't torn down and recreated on
 * every render when an inline function is passed.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => savedCallback.current(), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        savedCallback.current(); // catch up immediately on return
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, enabled]);
}
