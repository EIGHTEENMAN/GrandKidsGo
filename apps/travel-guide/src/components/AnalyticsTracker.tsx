"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const record = (event: string, metadata?: Record<string, unknown>) => {
      try {
        const body: Record<string, unknown> = { event, path: window.location.pathname, referrer: document.referrer || null };
        if (metadata) body.metadata = metadata;
        navigator.sendBeacon("/api/analytics", new Blob([JSON.stringify(body)], { type: "application/json" }));
      } catch {}
    };

    record("pageview");
    const start = Date.now();
    const handleUnload = () => { record("pageleave", { duration: Math.round((Date.now() - start) / 1000) }); };
    window.addEventListener("beforeunload", handleUnload);
    return () => { window.removeEventListener("beforeunload", handleUnload); handleUnload(); };
  }, [pathname]);

  return null;
}
