"use client";

import { usePathname } from "next/navigation";
import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { vtName } from "@/lib/viewTransition";

/**
 * The landing side of a `TransitionLink`. Reads the real current URL
 * (`usePathname`) rather than taking a name as a prop, so it always
 * agrees with whatever `TransitionLink href="..."` pointed at it —
 * one route, one name, derived the same way on both ends.
 *
 * Passes through the rest of the div/header/section's real attributes
 * (e.g. `data-enter` for the existing entrance-reveal CSS) rather than
 * re-deriving its own — this only adds the transition name, it
 * doesn't replace whatever presentation the caller already had.
 */
export function TransitionTarget({
  as: Tag = "div",
  className,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "header" | "section"; children: ReactNode }) {
  const pathname = usePathname();
  const mergedStyle: CSSProperties = { ...style, viewTransitionName: vtName(pathname) };
  if (Tag === "header") {
    return (
      <header className={className} style={mergedStyle} {...rest}>
        {children}
      </header>
    );
  }
  if (Tag === "section") {
    return (
      <section className={className} style={mergedStyle} {...rest}>
        {children}
      </section>
    );
  }
  return (
    <div className={className} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
}
