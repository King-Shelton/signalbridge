"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once `active` has been running longer than `delayMs`.
 * Used to surface a "the service is waking up" hint during Render's free-tier
 * cold start, so a slow first load reads as expected rather than broken.
 */
export function useSlowHint(active: boolean, delayMs = 6000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return slow;
}
