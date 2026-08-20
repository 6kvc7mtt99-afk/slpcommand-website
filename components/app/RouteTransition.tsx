"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Route choreography.
 *
 * True shared-element morphing needs React's experimental ViewTransition
 * build, which is not something to put on a production deploy. This is
 * the strongest production-safe approximation: intercept in-app
 * navigations, play a short directional exit on the outgoing view, then
 * navigate — so the incoming staged entrance reads as a continuation
 * rather than a hard swap.
 *
 * Direction is derived from the URL depth, so going deeper into a skill
 * pushes forward and coming back pulls back. Falls through untouched for
 * modified clicks, new tabs, downloads, external links and hashes, and is
 * disabled entirely under prefers-reduced-motion.
 */
const EXIT_MS = 150;

export function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();

  // Clear the leaving state once the new route has committed.
  useEffect(() => {
    document.documentElement.classList.remove("is-leaving", "is-deeper", "is-shallower");
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // Only choreograph inside the authenticated product.
      if (!anchor.closest(".app-shell")) return;

      const depthNow = window.location.pathname.split("/").filter(Boolean).length;
      const depthNext = url.pathname.split("/").filter(Boolean).length;

      event.preventDefault();
      const root = document.documentElement;
      root.classList.add("is-leaving", depthNext >= depthNow ? "is-deeper" : "is-shallower");
      window.setTimeout(() => router.push(url.pathname + url.search), EXIT_MS);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return null;
}
