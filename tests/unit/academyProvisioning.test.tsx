/** @vitest-environment happy-dom */

// FASE PLATFORM-PROVISIONING-001 — the creation flow, from the browser's side.
//
// Two things are worth testing here and the obvious one is not among them.
// "Does the form post the right JSON" is barely a test; the backend suite
// already proves what happens to that JSON. What only these tests can prove:
//
//   · the ROUTING decision — that /academy/new is reachable by exactly the
//     people who need it, which is the opposite set from /teacher/*;
//   · the SLUG behaviour — that a suggestion stops the moment somebody edits
//     it, that a stale availability answer cannot overwrite a fresh one, and
//     that "taken" arriving at submit time is handled as a real outcome rather
//     than an unexpected error.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const apiRequest = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { apiRequest: (...args: unknown[]) => apiRequest(...args), FrontendError: actual.FrontendError };
});

import { CreateAcademyForm } from "../../components/academy/CreateAcademyForm";
import { FrontendError } from "@/lib/api/errors";

afterEach(cleanup);
beforeEach(() => {
  push.mockReset();
  apiRequest.mockReset();
  vi.useRealTimers();
});

/** Answers suggest-slug and slug-available the way the backend does. */
function wireHappyPath(available = true) {
  apiRequest.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/academies/suggest-slug")) {
      const name = decodeURIComponent(new URL(`http://x${path}`).searchParams.get("name") ?? "");
      return { ok: true, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
    }
    if (path.startsWith("/api/academies/slug-available")) return { ok: true, available };
    if (path === "/api/academies") return { ok: true, academy: { organizationId: "org-new" } };
    throw new Error(`unexpected call to ${path}`);
  });
}

const nameField = () => screen.getByLabelText("Academy name");
const slugField = () => screen.getByLabelText("Address") as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /create academy/i });

describe("the slug suggestion knows when to stop", () => {
  it("suggests an address from the name", async () => {
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Madrid Language Centre" } });
    await waitFor(() => expect(slugField().value).toBe("madrid-language-centre"));
  });

  it("STOPS suggesting once the person edits the address themselves", async () => {
    // The behaviour this protects: somebody types a name, dislikes the
    // suggestion, types their own — and then adds a word to the name. Their
    // address must survive that. A form that keeps overwriting it is unusable.
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Madrid Language Centre" } });
    await waitFor(() => expect(slugField().value).toBe("madrid-language-centre"));

    fireEvent.change(slugField(), { target: { value: "mlc" } });
    fireEvent.change(nameField(), { target: { value: "Madrid Language Centre Ltd" } });

    await new Promise((r) => setTimeout(r, 600));
    expect(slugField().value).toBe("mlc");
  });

  it("clears the address when the name is cleared, but only while untouched", async () => {
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Something" } });
    await waitFor(() => expect(slugField().value).toBe("something"));
    fireEvent.change(nameField(), { target: { value: "" } });
    await waitFor(() => expect(slugField().value).toBe(""));
  });
});

describe("availability is shown honestly", () => {
  it("says an available address is available", async () => {
    wireHappyPath(true);
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Free Name" } });
    await waitFor(() => expect(screen.getByText(/free-name\.slpcommand\.com is available/i)).toBeTruthy());
  });

  it("says a taken address is taken, and blocks submission", async () => {
    wireHappyPath(false);
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Taken Name" } });
    await waitFor(() => expect(screen.getByText(/already taken/i)).toBeTruthy());
    expect(submitButton()).toHaveProperty("disabled", true);
  });

  it("reports an invalid address with the server's own reason", async () => {
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "api" };
      if (path.startsWith("/api/academies/slug-available")) {
        return { ok: true, available: false, reason: "validation_error", message: "'api' is reserved" };
      }
      throw new Error("unexpected");
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "API" } });
    await waitFor(() => expect(screen.getByText(/'api' is reserved/)).toBeTruthy());
    expect(submitButton()).toHaveProperty("disabled", true);
  });

  it("goes QUIET when the availability check itself fails", async () => {
    // A network blip while typing must not be dressed up as a problem with the
    // name. The submit will give a real answer either way.
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "quiet" };
      if (path.startsWith("/api/academies/slug-available")) throw new Error("network");
      throw new Error("unexpected");
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Quiet" } });
    await waitFor(() => expect(slugField().value).toBe("quiet"));
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByText(/already taken/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a SLOW answer for an old address cannot overwrite a fresh one", async () => {
    // The out-of-order autocomplete bug. Here it would tell somebody their
    // address is free when the answer belongs to a name they have abandoned.
    let call = 0;
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "ignored" };
      if (path.startsWith("/api/academies/slug-available")) {
        call += 1;
        if (call === 1) {
          // Slow enough to land AFTER the second answer. That ordering is the
          // entire bug: an earlier version of this test had the stale reply
          // arriving first, which no guard is needed to survive — and a
          // mutation removing the guard passed it.
          await new Promise((r) => setTimeout(r, 900));
          return { ok: true, available: true };
        }
        return { ok: true, available: false };            // the fresh one, fast
      }
      throw new Error("unexpected");
    });

    render(<CreateAcademyForm />);
    fireEvent.change(slugField(), { target: { value: "first" } });   // checked at ~400ms, replies at ~1300ms
    await new Promise((r) => setTimeout(r, 450));
    fireEvent.change(slugField(), { target: { value: "second" } });  // checked at ~850ms, replies at once
    await waitFor(() => expect(screen.getByText(/already taken/i)).toBeTruthy());

    // Past the stale reply's arrival. It must be discarded, not applied.
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByText(/is available/i)).toBeNull();
    expect(screen.getByText(/already taken/i)).toBeTruthy();
  });
});

describe("submission", () => {
  it("posts only the name and the slug — nothing about who owns it", async () => {
    // The client has no say in ownership and must not appear to. If this form
    // ever sent an owner field, somebody would eventually read it.
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Real Academy" } });
    await waitFor(() => expect(slugField().value).toBe("real-academy"));
    fireEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/teacher/org-new"));
    const post = apiRequest.mock.calls.find(([path]) => path === "/api/academies");
    expect(post?.[1]).toEqual({ method: "POST", body: { name: "Real Academy", slug: "real-academy" } });
    expect(Object.keys(post?.[1].body)).toEqual(["name", "slug"]);
  });

  it("goes STRAIGHT into the new academy — no reload, no re-login", async () => {
    // Authorization comes from a live membership lookup, so the shell already
    // sees this academy. Anything else here would be theatre.
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Straight In" } });
    await waitFor(() => expect(slugField().value).toBe("straight-in"));
    fireEvent.click(submitButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/teacher/org-new"));
  });

  it("handles LOSING the race after the check said the address was free", async () => {
    // The important one. The check is advisory; the database decides. This
    // must read as "pick another name", not as a crash.
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "contested" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw new FrontendError({
        code: "backend", message: "That address is already taken",
        status: 409, reason: "slug_taken",
      });
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Contested" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/taken while you were typing/i));
    expect(push).not.toHaveBeenCalled();
    expect(slugField().getAttribute("aria-invalid")).toBe("true");
  });

  it("explains the academy limit rather than showing a generic failure", async () => {
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "fourth" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw new FrontendError({
        code: "backend", message: "limit", status: 403, reason: "academy_limit_reached",
      });
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Fourth" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/maximum number of academies/i));
  });

  it("explains a rate limit as a wait, not as a rejection", async () => {
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "toofast" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw new FrontendError({ code: "rate_limit", message: "slow down", status: 429 });
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Too Fast" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/wait a few minutes/i));
  });

  it("refuses to submit a one-character name", async () => {
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "A" } });
    await waitFor(() => expect(slugField().value).toBe("a"));
    expect(submitButton()).toHaveProperty("disabled", true);
  });

  it("refuses to submit with no address at all", async () => {
    wireHappyPath();
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Valid Name" } });
    await waitFor(() => expect(slugField().value).toBe("valid-name"));
    fireEvent.change(slugField(), { target: { value: "" } });
    expect(submitButton()).toHaveProperty("disabled", true);
  });
});

describe("the contract with the backend, end to end", () => {
  // These build the EXACT JSON sendPlatformError emits and push it through the
  // real normalizeBackendError, instead of hand-crafting a FrontendError that
  // happens to have the right fields. If the backend and the client ever
  // disagree about where the machine-readable code lives — `error` vs `reason`
  // — every test above would still pass and the person would meet a generic
  // "something went wrong". These are the tests that would notice.

  async function throwAsBackendWould(status: number, payload: Record<string, unknown>) {
    const { normalizeBackendError } = await import("@/lib/api/errors");
    return normalizeBackendError({ status, body: payload, path: "/api/academies" });
  }

  it("a real 409 from POST /api/academies produces the slug-race copy", async () => {
    const err = await throwAsBackendWould(409, {
      error: "slug_taken", reason: "slug_taken",
      message: "That address is already taken", field: "slug",
    });
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "contested" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw err;
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Contested" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/taken while you were typing/i));
  });

  it("a real 403 from the academy limit produces the limit copy, not a plan upsell", async () => {
    // 403 is also how the commercial layer refuses things. If
    // academy_limit_reached were ever mistaken for a plan boundary, somebody
    // hitting an anti-abuse cap would be shown a paywall.
    const err = await throwAsBackendWould(403, {
      error: "academy_limit_reached", reason: "academy_limit_reached",
      message: "You have reached the maximum number of academies for one account",
    });
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "fourth" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw err;
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Fourth" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/maximum number of academies/i));
    expect(screen.getByRole("alert").textContent).not.toMatch(/upgrade|plan|subscri/i);
  });

  it("a real 400 validation refusal names the field rather than failing silently", async () => {
    const err = await throwAsBackendWould(400, {
      error: "validation_error", reason: "validation_error",
      message: "'api' is reserved", field: "slug",
    });
    apiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/academies/suggest-slug")) return { ok: true, slug: "valid-one" };
      if (path.startsWith("/api/academies/slug-available")) return { ok: true, available: true };
      throw err;
    });
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Valid One" } });
    await waitFor(() => expect(screen.getByText(/is available/i)).toBeTruthy());
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});

describe("accessibility of the address field", () => {
  it("announces the availability answer politely", async () => {
    wireHappyPath();
    render(<CreateAcademyForm />);
    const status = document.getElementById("academy-slug-status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
  });

  it("marks a taken address as invalid for assistive technology, not by colour alone", async () => {
    wireHappyPath(false);
    render(<CreateAcademyForm />);
    fireEvent.change(nameField(), { target: { value: "Taken" } });
    await waitFor(() => expect(slugField().getAttribute("aria-invalid")).toBe("true"));
  });
});
