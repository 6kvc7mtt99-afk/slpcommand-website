"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the authenticated product.
 *
 * Deliberately not a wrapper component: wrapping every section in an
 * extra <div> would break the grid/flex parents the layouts depend on.
 * Instead any server-rendered element opts in with `data-reveal`, and
 * this observer — mounted once per page by the layout — animates them.
 *
 * The hidden state is applied by adding `.reveal-armed` to <html> from
 * JS, so the CSS that hides elements only ever exists once we know an
 * observer is running. Without JS, or if hydration fails, every element
 * renders visible instead of being permanently invisible.
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

    // Anything already in view on load reveals immediately rather than
    // waiting for a scroll that may never come on a short page.
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92) {
        node.classList.add("is-in");
      } else {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
