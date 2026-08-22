"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The plan boundary, as a dialog.
 *
 * It carried `role="dialog" aria-modal="true"` and none of what those
 * attributes promise: Escape did nothing, the backdrop was inert, focus stayed
 * behind the overlay on whatever the learner had just clicked, and the page
 * underneath still scrolled. A keyboard user could tab straight out of a modal
 * that claimed to be modal, and a screen-reader user was never moved into it.
 *
 * Now it behaves like one: focus moves in on open and returns to the trigger on
 * close, Tab is trapped, Escape and the backdrop both dismiss it, and the body
 * is locked while it is up. Nothing about what it SAYS changed — a plan
 * boundary is information, not a checkout, and it must never look like one.
 */
export function CommercialDialog({
  open,
  title = "You've used this Free allowance.",
  body = "Free measures all four skills with weekly and monthly allowances. Open your plan to see what is left. This dialog does not charge you.",
  onClose,
}: {
  open: boolean;
  title?: string;
  body?: string;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const trap = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !cardRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement;
    // The heading is not focusable by default; the first control is where a
    // keyboard user can actually act, and the dialog is labelled by its title
    // so the context is announced with it.
    const items = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    items?.[0]?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", trap, true);

    return () => {
      document.removeEventListener("keydown", trap, true);
      document.body.style.overflow = previousOverflow;
      const back = returnFocusTo.current;
      if (back instanceof HTMLElement && document.contains(back)) back.focus();
    };
  }, [open, trap]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article
        ref={cardRef}
        className="plan-lock plan-lock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-title"
        aria-describedby="commercial-body"
      >
        <span className="plan-lock-mark" aria-hidden="true" />
        <p className="plan-lock-kicker">Plan boundary</p>
        <h2 id="commercial-title">{title}</h2>
        <p className="plan-lock-body" id="commercial-body">
          {body}
        </p>
        <div className="cta-row" style={{ marginTop: 18 }}>
          <Link className="btn btn-primary" href="/subscription" onClick={onClose}>
            Open plan
          </Link>
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Not now
          </button>
        </div>
      </article>
    </div>
  );
}
