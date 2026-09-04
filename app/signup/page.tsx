"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/marketing/SiteChrome";
import { AuthContext } from "@/components/marketing/AuthContext";
import { signupErrorMessage } from "@/lib/api/client";

/**
 * Signup, as two screens instead of five.
 *
 * What changed, and what did not. The request to `/api/auth/register` is the
 * same request with the same keys and the same internal values: the option
 * values below are the enums the backend has always received; only the
 * labels a person reads are new. The CEFR self-estimate is gone from the form
 * — the backend treats it as optional and nothing downstream reads it — so it
 * is simply not sent. Email confirmation, session cookies and every security
 * rule live in the route handler and the backend and are untouched.
 */

const ROLES = [
  { value: "military", label: "Military or defence personnel" },
  { value: "civilian", label: "Civilian" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
] as const;

const GOALS = [
  { value: "stanag_exam", label: "Pass a STANAG 6001 / SLP exam" },
  { value: "military_proficiency", label: "Keep up military English proficiency" },
  { value: "casual_learning", label: "General English practice" },
  { value: "advanced_mode", label: "Advanced training" },
] as const;

const DEADLINES = [
  { value: "this_month", label: "This month" },
  { value: "three_months", label: "Within three months" },
  { value: "six_months", label: "Within six months" },
  { value: "flexible", label: "No fixed date yet" },
] as const;

type Role = (typeof ROLES)[number]["value"];
type Goal = (typeof GOALS)[number]["value"];
type Deadline = (typeof DEADLINES)[number]["value"];

const STEPS = ["Account", "Your preparation"] as const;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    country: "",
    professionRole: "military" as Role,
    learningGoal: "stanag_exam" as Goal,
    goalDeadline: "flexible" as Deadline,
    accepted: false,
  });
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const announced = useRef(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Moving between screens moves focus to the first field of the new screen,
  // so a keyboard or screen-reader user is never left on a button that has
  // just disappeared. The very first render leaves focus where the browser
  // put it.
  useEffect(() => {
    if (!announced.current) {
      announced.current = true;
      return;
    }
    firstFieldRef.current?.focus();
  }, [step]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    if (!form.accepted) {
      setError("You must accept the Terms, Privacy Policy and Responsible AI Policy.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          country: form.country,
          professionRole: form.professionRole,
          learningGoal: form.learningGoal,
          goalDeadline: form.goalDeadline,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        userId?: string;
        needsEmailConfirmation?: boolean;
        error?: string;
      };
      if (!res.ok) {
        // The reason was already in the response and was being discarded.
        setError(signupErrorMessage(res.status, res.status >= 500 || data.error === "network", data.error));
        return;
      }
      if (data.needsEmailConfirmation) {
        setStep(2);
        return;
      }
      router.replace("/onboarding");
    } catch {
      setError(signupErrorMessage(0, true));
    } finally {
      setBusy(false);
    }
  }

  const current = Math.min(step, 1);

  return (
    <div className="site">
      <SiteHeader
        links={[
          { href: "/trust-center", label: "Trust Center" },
          { href: "/support", label: "Support" },
          { href: "/login", label: "Log in" },
        ]}
      />
      <main className="auth-stage" id="content">
        <AuthContext mode="signup" />
        <div className="auth-card">
          <p className="section-eyebrow">Free account</p>
          <h1>Create an account</h1>
          <p className="updated" aria-live="polite">
            {step === 2 ? "Done" : `Step ${current + 1} of ${STEPS.length} · ${STEPS[current]}`}
          </p>
          <div className="auth-steps" aria-hidden="true">
            {STEPS.map((name, n) => (
              <span key={name} className={n <= current ? "is-on" : ""} />
            ))}
          </div>

          {step === 2 ? (
            <div className="feedback-banner info" role="status">
              <p>
                <strong>Account created.</strong>
              </p>
              <p>Check your inbox for a confirmation email and click the link in it — you won&apos;t be able to log in until you do.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate={false}>
              {step === 0 ? (
                <fieldset>
                  <legend>Account</legend>
                  <label htmlFor="email">Email</label>
                  <input
                    ref={firstFieldRef}
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  <label htmlFor="password">
                    Password
                    <span className="field-hint" id="password-hint">
                      At least 8 characters.
                    </span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-describedby="password-hint"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                  <label htmlFor="firstName">First name</label>
                  <input id="firstName" autoComplete="given-name" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  <label htmlFor="lastName">Last name</label>
                  <input id="lastName" autoComplete="family-name" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                </fieldset>
              ) : (
                <fieldset>
                  <legend>Your preparation</legend>
                  <label htmlFor="country">Country</label>
                  <input ref={firstFieldRef} id="country" autoComplete="country-name" required value={form.country} onChange={(e) => set("country", e.target.value)} />
                  <label htmlFor="role">I am</label>
                  <select id="role" value={form.professionRole} onChange={(e) => set("professionRole", e.target.value as Role)}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="goal">My goal</label>
                  <select id="goal" value={form.learningGoal} onChange={(e) => set("learningGoal", e.target.value as Goal)}>
                    {GOALS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="deadline">My next sitting</label>
                  <select id="deadline" value={form.goalDeadline} onChange={(e) => set("goalDeadline", e.target.value as Deadline)}>
                    {DEADLINES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <label className="auth-consent" htmlFor="accepted">
                    <input id="accepted" type="checkbox" required checked={form.accepted} onChange={(e) => set("accepted", e.target.checked)} />
                    <span>
                      I am 16 or older and I accept the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link> and{" "}
                      <Link href="/ai-usage">Responsible AI Policy</Link>.
                    </span>
                  </label>
                </fieldset>
              )}

              {error ? (
                <p className="err" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="auth-actions">
                <button className="s-btn s-btn--primary" type="submit" disabled={busy}>
                  {step === 0 ? "Continue" : busy ? "Creating…" : "Create account"}
                </button>
                {step === 1 ? (
                  <button className="auth-back" type="button" onClick={() => setStep(0)} disabled={busy}>
                    Back
                  </button>
                ) : null}
              </div>
            </form>
          )}

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
