"use client";

import { useEffect, useRef, useState } from "react";

export function ExamTimer({
  seconds,
  onExpire,
}: {
  seconds: number;
  onExpire: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [announce, setAnnounce] = useState("");
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  /**
   * A clock only exists when the server sent a duration.
   *
   * THE BUG THIS FIXES. Both exam decoders default `timeLimitSeconds` to 0
   * when the field is absent or unparseable (lib/api/readingExam.ts,
   * lib/api/listeningExam.ts) and still return a valid session. This
   * component initialised `left` to that 0, and its first tick computed
   * `Math.max(0, 0 - 1) === 0`, hit the `next === 0` branch and called
   * `onExpire()` — which is `finish(exam, answers)` with every answer still
   * unset. One renamed field upstream and the learner's exam is submitted
   * blank one second after they accept the gate, spending an allowance that
   * is 1/month on Free, while the bar reads "Time left 0:00" throughout.
   *
   * A non-positive duration means "this session has no clock", never "this
   * session is already over". The timer renders nothing and never fires;
   * the exam runs untimed, which is safe because the backend — not this
   * component — is the authority that scores the submission and enforces
   * the real limit.
   */
  const timed = Number.isFinite(seconds) && seconds > 0;

  useEffect(() => {
    setLeft(seconds);
    expired.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        const next = Math.max(0, value - 1);
        // Milestones a candidate can actually pace against, rather than a
        // tick. Announced politely, so each one waits its turn.
        if (next === 600) setAnnounce("Ten minutes remaining.");
        else if (next === 300) setAnnounce("Five minutes remaining.");
        else if (next === 120) setAnnounce("Two minutes remaining.");
        else if (next === 60) setAnnounce("One minute remaining.");
        else if (next === 30) setAnnounce("Thirty seconds remaining.");
        else if (next === 10) setAnnounce("Ten seconds remaining.");
        if (next === 0 && !expired.current) {
          expired.current = true;
          onExpireRef.current();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds, timed]);

  if (!timed) return null;

  const minutes = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  /**
   * The visible clock is NOT a live region.
   *
   * It used to flip to aria-live="assertive" for the whole final minute, and
   * its text changes every second — so a screen-reader user was interrupted
   * sixty times in a row, during the most pressure-loaded minute of an exam,
   * with no way to hear anything else. role="timer" describes what it is and
   * the label is readable on demand; the milestone announcements above are the
   * ones that carry information, at a cadence a person can act on.
   */
  return (
    <p className="exam-timer" role="timer" aria-label={`Time left ${minutes} minutes ${secs} seconds`}>
      Time left {minutes}:{secs}
      <span className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </span>
    </p>
  );
}
