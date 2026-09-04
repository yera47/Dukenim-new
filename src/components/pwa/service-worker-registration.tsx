"use client";

import { useEffect } from "react";

/**
 * Registers a deliberately narrow offline shell. Authenticated pages and API
 * responses remain network-only, so tenant data is never stored by the browser
 * cache.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is progressive; a failed registration must not affect commerce.
    });
  }, []);

  return null;
}
