/**
 * A thin wrapper around the browser's native View Transitions API
 * (`document.startViewTransition`) — not React's experimental
 * `<ViewTransition>` component, which is unsafe for production and was
 * explicitly ruled out. This is a shipped, stable Web Platform API
 * (Chromium since 2023, Safari since 18); where it doesn't exist, or the
 * viewer asked for reduced motion, this degrades to a plain navigation
 * with no morph — never a broken one.
 *
 * `vtName` gives two elements on different pages the same
 * `view-transition-name` so the browser interpolates between them
 * instead of cross-fading — the entry card becomes the destination's
 * header, not two unrelated screens swapping.
 */
export function vtName(...parts: string[]): string {
  return `vt-${parts.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
}

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function withViewTransition(mutate: () => void): void {
  if (!supportsViewTransitions()) {
    mutate();
    return;
  }
  document.startViewTransition(() => mutate());
}
