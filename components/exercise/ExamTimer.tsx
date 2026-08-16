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

  useEffect(() => {
    setLeft(seconds);
    expired.current = false;
  }, [seconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((value) => {
        const next = Math.max(0, value - 1);
        if (next === 60) setAnnounce("One minute remaining.");
        else if (next > 0 && next % 60 === 0) setAnnounce(`${Math.floor(next / 60)} minutes remaining.`);
        if (next === 0 && !expired.current) {
          expired.current = true;
          onExpireRef.current();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  const minutes = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  return (
    <p className="exam-timer" aria-live={left <= 60 ? "assertive" : "off"}>
      Time left {minutes}:{secs}
      <span className="visually-hidden" aria-live="polite">
        {announce}
      </span>
    </p>
  );
}
