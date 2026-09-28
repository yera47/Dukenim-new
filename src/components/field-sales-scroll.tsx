"use client";

import { useEffect } from "react";

export function FieldSalesScroll({ leadId }: { leadId: string }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.getElementById(`lead-${leadId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [leadId]);
  return null;
}
