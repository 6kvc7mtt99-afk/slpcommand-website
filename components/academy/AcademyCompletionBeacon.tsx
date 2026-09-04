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

    /**
     * THE BUG THIS FIXES — the sentinel fired on OPEN for short lessons.
     *
     * IntersectionObserver invokes its callback immediately on observe() with
     * the current intersection state, and a zero-height target that intersects
     * reports ratio 1, clearing this 0.1 threshold. Every content block in
     * AcademyLessonView is conditional and `decodeAcademyLesson` requires only
     * id + title, so a thin lesson renders header + footer — roughly 700px,
     * which fits above the fold on a maximised desktop window. The sentinel
     * was then already visible at mount and the completion POSTed instantly.
     *
     * That is precisely what this component's own docstring says must never
     * happen: it "would record OPENING a lesson as COMPLETING it, which would
     * fill the one table meant to be evidence of learning with rows that are
     * not evidence of anything". Those rows also surface to teachers as
     * "Academy lessons" completed, so the false signal leaves the product.
     *
     * "Reached the end" needs a real signal, and which signal is available
     * depends on the page:
     *  - Scrollable lesson: the learner must actually scroll. Intersection
     *    alone is then genuine evidence they moved through the content.
     *  - Lesson that fits one screen: there is nothing to scroll, so
     *    "scrolled past" cannot be observed at all. Dwell is the honest
     *    substitute — the lesson held the screen for DWELL_MS.
     * Either way the beacon can no longer fire on arrival.
     */
    const DWELL_MS = 8000;
    let scrolled = false;
    let dwellTimer: number | null = null;

    const onScroll = () => {
      scrolled = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const scrollable = () =>
      document.documentElement.scrollHeight > window.innerHeight + 40;

    const clearDwell = () => {
      if (dwellTimer != null) window.clearTimeout(dwellTimer);
      dwellTimer = null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (sent.current) return;
        if (!entries.some((e) => e.isIntersecting)) {
          clearDwell();
          return;
        }
        // A scrollable page that has never been scrolled means the sentinel is
        // visible because the observer just started, not because the learner
        // arrived at the end.
        if (scrollable() && !scrolled) return;
        if (dwellTimer != null) return;
        dwellTimer = window.setTimeout(() => {
          if (sent.current) return;
          sent.current = true;
          observer.disconnect();
          record();
        }, DWELL_MS);
      },
      // A sliver is enough: the sentinel sits after the last content block, so
      // any part of it becoming visible means the content above it has been
      // scrolled past.
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      clearDwell();
      window.removeEventListener("scroll", onScroll);
    };

    function record() {
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
    }
  }, [skill, activityId]);

  return <div ref={sentinel} aria-hidden="true" data-academy-completion-sentinel />;
}
