"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";

// FASE PLATFORM-PROVISIONING-001 — the form that creates an academy.
//
// Two fields, and the second one is the interesting one. The slug is the
// academy's permanent address, so this form does three things that a plain
// text input would not:
//
//   1. It SUGGESTS a slug from the name, and stops suggesting the moment the
//      person edits it themselves. Continuing to overwrite what somebody typed
//      is the single most irritating thing a form of this shape can do.
//   2. It CHECKS availability while they type, so "taken" arrives before the
//      button and not after it.
//   3. It TREATS that check as advisory. The submit handler has a real branch
//      for "it was free a second ago and is not now", because between the
//      check and the insert somebody else can win the race. The database is
//      the arbiter; this is only a courtesy.
//
// There is no optimistic UI. Nothing on this screen claims the academy exists
// until the server says it does, because the follow-up action is a redirect
// into it — and redirecting into an academy that failed to be created is a far
// worse experience than half a second of waiting.

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "free" }
  | { state: "taken" }
  | { state: "invalid"; message: string };

/** Long enough that ordinary typing does not fire a request per keystroke. */
const DEBOUNCE_MS = 400;

const ERROR_COPY: Record<string, string> = {
  slug_taken: "That address was taken while you were typing. Choose another one.",
  academy_limit_reached: "This account already owns the maximum number of academies.",
  validation_error: "Check the highlighted field and try again.",
};

export function CreateAcademyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Guards against a slow response for an old query overwriting the answer to
  // a newer one — the classic out-of-order-autocomplete bug, which here would
  // show "available" for a slug the person has already moved on from.
  const requestSeq = useRef(0);

  const checkAvailability = useCallback(async (candidate: string) => {
    const seq = ++requestSeq.current;
    if (!candidate) {
      setAvailability({ state: "idle" });
      return;
    }
    setAvailability({ state: "checking" });
    try {
      const result = await apiRequest<{
        ok: true; available: boolean; reason?: string; message?: string;
      }>(`/api/academies/slug-available?slug=${encodeURIComponent(candidate)}`);
      if (seq !== requestSeq.current) return;
      if (result.available) setAvailability({ state: "free" });
      else if (result.reason === "validation_error") {
        setAvailability({ state: "invalid", message: result.message ?? "That address cannot be used." });
      } else setAvailability({ state: "taken" });
    } catch {
      if (seq !== requestSeq.current) return;
      // A failed CHECK is not a failed creation. Going quiet is right: the
      // submit will give a real answer, and an alarming red message about a
      // network blip would read as though the name were the problem.
      setAvailability({ state: "idle" });
    }
  }, []);

  // Suggest a slug from the name, until the person takes the wheel.
  useEffect(() => {
    if (slugTouched) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setSlug("");
      setAvailability({ state: "idle" });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // The suggestion is computed on the SERVER, by the same slugifyName the
        // rest of the platform uses. A local copy would be a second answer to
        // "what does this name become", and the two would drift.
        const result = await apiRequest<{ ok: true; slug: string }>(
          `/api/academies/suggest-slug?name=${encodeURIComponent(trimmed)}`,
        );
        if (slugTouched) return;
        setSlug(result.slug);
        void checkAvailability(result.slug);
      } catch {
        /* No suggestion is better than a wrong one; the field stays editable. */
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [name, slugTouched, checkAvailability]);

  // Check whatever is in the field once the person has taken it over.
  useEffect(() => {
    if (!slugTouched) return;
    const timer = setTimeout(() => void checkAvailability(slug.trim().toLowerCase()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [slug, slugTouched, checkAvailability]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrorField(null);
    try {
      const result = await apiRequest<{ ok: true; academy: { organizationId: string } }>(
        "/api/academies",
        { method: "POST", body: { name: name.trim(), slug: slug.trim().toLowerCase() } },
      );
      // Straight in. No session refresh and no reload of the membership list:
      // authorization is resolved from a live membership lookup on every
      // request, so the teacher shell already sees this academy.
      router.push(`/teacher/${result.academy.organizationId}`);
      return;
    } catch (err) {
      if (err instanceof FrontendError) {
        if (err.status === 429) {
          setError("Too many attempts. Wait a few minutes and try again.");
        } else {
          const code = err.reason ?? err.code;
          setError(ERROR_COPY[code] ?? err.message ?? "Could not create the academy. Try again.");
          if (code === "slug_taken") {
            setErrorField("slug");
            setAvailability({ state: "taken" });
          }
        }
      } else {
        setError("Could not create the academy. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const slugValue = slug.trim().toLowerCase();
  const canSubmit =
    !busy &&
    name.trim().length >= 2 &&
    slugValue.length > 0 &&
    availability.state !== "invalid" &&
    availability.state !== "taken";

  return (
    <form className="academy-form" onSubmit={submit} noValidate>
      <div className="academy-field">
        <label htmlFor="academy-name">Academy name</label>
        <input
          id="academy-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="organization"
          required
          aria-describedby="academy-name-hint"
          aria-invalid={errorField === "name" || undefined}
        />
        <p className="academy-hint" id="academy-name-hint">
          What your teachers and students will see. You can change it later.
        </p>
      </div>

      <div className="academy-field">
        <label htmlFor="academy-slug">Address</label>
        <div className="academy-slug-row">
          <input
            id="academy-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            maxLength={63}
            autoComplete="off"
            spellCheck={false}
            required
            aria-describedby="academy-slug-status academy-slug-hint"
            aria-invalid={
              availability.state === "taken" || availability.state === "invalid" || errorField === "slug"
                ? true
                : undefined
            }
          />
          <span className="academy-slug-suffix">.slpcommand.com</span>
        </div>

        {/* aria-live so the availability answer reaches a screen-reader user at
            the moment it arrives, rather than only on the next focus change. */}
        <p className="academy-slug-status" id="academy-slug-status" aria-live="polite">
          {availability.state === "checking" && <span className="academy-muted">Checking…</span>}
          {availability.state === "free" && <span className="academy-ok">{slugValue}.slpcommand.com is available</span>}
          {availability.state === "taken" && <span className="academy-bad">That address is already taken</span>}
          {availability.state === "invalid" && <span className="academy-bad">{availability.message}</span>}
        </p>

        <p className="academy-hint" id="academy-slug-hint">
          Lowercase letters, numbers and hyphens. This becomes your academy&rsquo;s
          permanent web address, so choose carefully.
        </p>
      </div>

      {error && (
        <p className="academy-error-block" role="alert">
          {error}
        </p>
      )}

      <div className="academy-form-actions">
        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
          {busy ? "Creating…" : "Create academy"}
        </button>
      </div>
    </form>
  );
}
