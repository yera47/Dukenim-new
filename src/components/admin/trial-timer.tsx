"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { startMonotonicTrialTicker, trialClockDisplay } from "@/lib/trial-clock";

export function TrialTimer({ endsAt, serverNow, compact = false }: { endsAt: string; serverNow: number; compact?: boolean }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = startMonotonicTrialTicker({serverNow,monotonicNow:()=>performance.now(),publish:setNow,setInterval:(callback,ms)=>window.setInterval(callback,ms)});
    return () => window.clearInterval(id);
  }, [serverNow]);

  const display = trialClockDisplay({ status: "trial", endsAt, nowMs: now });
  return (
    <Link
      href="/admin/plan"
      aria-label={display.fullLabel}
      className="flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--accent-dark)]"
    >
      <span className={`size-2 rounded-full ${display.state === "active" ? "bg-[var(--accent)]" : "bg-amber-600"}`} />
      <span className={compact ? "hidden sm:inline" : undefined}>{display.fullLabel}</span>
      {compact && <span className="sm:hidden">{display.compactLabel}</span>}
    </Link>
  );
}
