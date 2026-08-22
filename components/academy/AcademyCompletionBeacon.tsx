"use client";

import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api/client";

/**
 * FASE ACADEMY-LOOP-CLOSURE-001 — the web half of the Academy completion signal.
 *
 * POST /api/academy/complete, its RPC and its table have existed in production
 * since RETENTION-ENGINE-PHASE-3 with zero call sites in either client and zero
 * rows in `user_academy_completions`. Without it Academy produces no record, so
 * there is no mastery attribution, no learning-outcome metric and no sequencing
 * memory — the Intelligence → Academy → Practice loop never closes.
 *
 * WHAT THIS RECORDS, EXACTLY. "The learner reached the end of the lesson
 * content." Not "mastered", not "understood". The web renders a lesson as one
 * page, so there is no paced final step to bind to the way the iOS class view
 * has; the honest observable event is that the end of the content entered the
 * viewport. Naming it precisely here matters more than usual, because this row
 * is the thing a learning-outcome claim would later be built on.
 *
 * WHY AN INTERSECTION OBSERVER AND NOT `useEffect` ON MOUNT. Firing on mount
 * would record OPENING a lesson as COMPLETING it, which would fill the one table
 * meant to be evidence of learning with rows that are not evidence of anything.
 * That is a worse outcome than the empty table this fixes.
 *
 * Best-effort by design: a learner who has just finished reading must never be
 * shown a network error for a write they did not ask for. The backend handler is
 * not best-effort, and a real failure there is logged server-side.
 */
export function AcademyCompletionBeacon({
  skill,
  activityId,
}: {
  /** "reading" | "listening" | "writing" | "speaking" — the backend rejects anything else. */
  skill: string;
  /** A STABLE catalogue identifier. Never a display title: `user_academy_completions` is UNIQUE on (user, skill, activity_id, date). */
  activityId: string;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Survives re-render, unlike state, and never triggers one.
  const sent = useRef(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;

    // No IntersectionObserver (very old browser, some test environments) means
    // no honest signal is available. Recording anyway would be exactly the
    // "opened counts as completed" defect this component exists to avoid, so
    // the correct behaviour is to record nothing.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || sent.current) return;
        sent.current = true;
        observer.disconnect();
        void apiRequest("/academy/complete", {
          method: "POST",
          body: {
            academySkill: skill,
            activityId,
            completedAt: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }).catch(() => {
          // Released so a later visit in the same session can still record it.
          sent.current = false;
        });
      },
      // A sliver is enough: the sentinel sits after the last content block, so
      // any part of it becoming visible means the content above it has been
      // scrolled past.
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [skill, activityId]);

  return <div ref={sentinel} aria-hidden="true" data-academy-completion-sentinel />;
}
