"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { type AnchorHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { supportsViewTransitions, vtName, withViewTransition } from "@/lib/viewTransition";

/**
 * `next/link` that, only where the browser actually supports it and the
 * viewer hasn't asked for reduced motion, wraps the navigation in a real
 * `document.startViewTransition`. Everywhere else it's an ordinary Link —
 * same href, same prefetch, same keyboard/middle-click/new-tab behaviour,
 * since `preventDefault` only ever runs on the supported, motion-safe path.
 *
 * `view-transition-name` is derived from `href` automatically, so a card
 * here and the matching page's `<TransitionTarget href>` on the far side
 * only have to agree on one string (the route itself) rather than each
 * caller inventing and threading its own name.
 */
export function TransitionLink({
  href,
  children,
  onClick,
  style,
  ...rest
}: LinkProps & AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!supportsViewTransitions()) return;
    event.preventDefault();
    withViewTransition(() => {
      router.push(href.toString());
    });
  }

  const mergedStyle: CSSProperties = { ...style, viewTransitionName: vtName(href.toString()) };

  return (
    <Link href={href} onClick={handleClick} style={mergedStyle} {...rest}>
      {children}
    </Link>
  );
}
