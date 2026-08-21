"use client";

import { useCallback } from "react";

/**
 * Pointer-aware tilt for a destination door.
 *
 * Writes --tx/--ty/--hover as CSS custom properties on the element itself
 * — the same lean-toward-the-pointer grammar the readiness instrument
 * already renders on canvas — so a fast pointermove never triggers a
 * React re-render. `.is-live-tilt` is added imperatively, only once we
 * know a pointer is actually present and the visitor has not asked for
 * less motion, so no-JS, touch and reduced-motion all fall through to
 * the plain a.p-dest:hover already declared for every other page.
 */
export function useTilt<T extends HTMLElement>() {
  return useCallback((node: T | null) => {
    if (!node) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(hover: none)").matches
    ) {
      return;
    }

    node.classList.add("is-live-tilt");

    function onMove(e: PointerEvent) {
      const box = node!.getBoundingClientRect();
      node!.style.setProperty("--tx", (((e.clientX - box.left) / box.width - 0.5) * 2).toFixed(3));
      node!.style.setProperty("--ty", (((e.clientY - box.top) / box.height - 0.5) * 2).toFixed(3));
    }
    function onEnter() {
      node!.classList.add("is-tracking");
      node!.style.setProperty("--hover", "1");
    }
    function onLeave() {
      node!.classList.remove("is-tracking");
      node!.style.setProperty("--tx", "0");
      node!.style.setProperty("--ty", "0");
      node!.style.setProperty("--hover", "0");
    }

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerenter", onEnter);
    node.addEventListener("pointerleave", onLeave);

    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);
}
