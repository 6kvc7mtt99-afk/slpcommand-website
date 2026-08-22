/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommercialDialog } from "../../components/exercise/CommercialDialog";

afterEach(cleanup);

/**
 * The plan boundary is the screen a learner meets at their least patient
 * moment — mid-task, blocked. It claimed `aria-modal` while behaving like a
 * div: Escape did nothing, the backdrop was inert, focus never entered it and
 * Tab walked straight out the back. These lock the behaviour those attributes
 * promise.
 */
describe("commercial dialog", () => {
  function open(onClose = vi.fn()) {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.appendChild(trigger);
    trigger.focus();
    const view = render(<CommercialDialog open onClose={onClose} />);
    return { onClose, trigger, view };
  }

  it("renders nothing at all when closed", () => {
    render(<CommercialDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("is labelled and described by its own copy", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("commercial-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("commercial-body");
  });

  it("moves focus into the dialog on open and back to the trigger on close", () => {
    const { trigger, view } = open();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Open plan" }));
    view.unmount();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape", () => {
    const { onClose } = open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a backdrop click but not on a click inside the card", () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog in both directions", () => {
    open();
    const close = screen.getByRole("link", { name: "Open plan" });
    const link = screen.getByRole("button", { name: "Not now" });

    link.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(link);
  });

  it("locks the page behind it and restores scrolling on close", () => {
    const { view } = open();
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("points at the commercial surface, and offers nothing that looks like a checkout", () => {
    open();
    expect(screen.getByRole("link", { name: "Open plan" })).toHaveProperty("href");
    expect(screen.getByRole("link", { name: "Open plan" }).getAttribute("href")).toBe("/subscription");
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll("input, form")).toHaveLength(0);
    expect(dialog.textContent ?? "").not.toMatch(/\b(Subscribe|Buy now|Pay)\b/i);
  });
});
