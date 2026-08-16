"use client";

import { useEffect } from "react";

export function SentryInit() {
  useEffect(() => {
    void import("@/lib/observability/sentry").then((mod) => mod.initSentry("client"));
  }, []);
  return null;
}
