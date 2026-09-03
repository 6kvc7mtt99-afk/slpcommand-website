"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the public site — same technique as the authenticated
 * app's components/ui/Reveal.tsx (an observer arms `data-reveal` elements
 * only once it is actually running), kept as a separate component because
 * the public site and the app do not share a stylesheet or a layout root.
 */
export function Reveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (nodes.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }

    document.documentElement.classList.add("reveal-armed");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92) {
        // Already on screen: shown at once, with no fade. Content in the first
        // viewport must never be sampled at partial opacity — by a reader, a
        // contrast check, or the LCP timer.
        node.classList.add("is-in", "is-instant");
      } else {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
