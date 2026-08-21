"use client";

import { usePathname } from "next/navigation";
import { type CSSProperties, type ReactNode } from "react";
import { vtName } from "@/lib/viewTransition";

/**
 * The landing side of a `TransitionLink`. Reads the real current URL
 * (`usePathname`) rather than taking a name as a prop, so it always
 * agrees with whatever `TransitionLink href="..."` pointed at it —
 * one route, one name, derived the same way on both ends.
 */
export function TransitionTarget({ as: Tag = "div", className, children }: { as?: "div" | "header"; className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const style: CSSProperties = { viewTransitionName: vtName(pathname) };
  if (Tag === "header") {
    return (
      <header className={className} style={style}>
        {children}
      </header>
    );
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
