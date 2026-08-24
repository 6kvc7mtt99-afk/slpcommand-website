"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/marketing/SiteChrome";
import { AuthContext } from "@/components/marketing/AuthContext";
import { loginErrorMessage } from "@/lib/api/client";

const ROLES = ["military", "civilian", "student", "other"] as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const GOALS = ["stanag_exam", "military_proficiency", "casual_learning", "advanced_mode"] as const;
const DEADLINES = ["this_month", "three_months", "six_months", "flexible"] as const;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    country: "",
    professionRole: "military" as (typeof ROLES)[number],
    englishLevel: "B1" as (typeof LEVELS)[number],
    learningGoal: "stanag_exam" as (typeof GOALS)[number],
    goalDeadline: "flexible" as (typeof DEADLINES)[number],
    accepted: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (!form.accepted) {
      setError("You must accept the Terms, Privacy Policy and Responsible AI Policy.");
      return;
    }
    setBusy(true);
    setError("");
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
          englishLevel: form.englishLevel,
          learningGoal: form.learningGoal,
          goalDeadline: form.goalDeadline,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        userId?: string;
        needsEmailConfirmation?: boolean;
      };
      if (!res.ok) {
        setError(loginErrorMessage(res.status, res.status >= 500));
        return;
      }
      if (data.needsEmailConfirmation) {
        setError("");
        setStep(5);
        return;
      }
      router.replace("/onboarding");
    } catch {
      setError(loginErrorMessage(0, true));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader
        links={[
          { href: "/trust-center", label: "Trust Center" },
          { href: "/support", label: "Support" },
          { href: "/login", label: "Log in" },
        ]}
      />
      <main className="auth-stage">
        <AuthContext mode="signup" />
        <div className="auth-card">
        <p className="section-eyebrow">Workspace</p>
        <h1>Create an account</h1>
        <p className="updated">Step {Math.min(step + 1, 5)} of 5</p>
        <div className="auth-steps" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= Math.min(step, 4) ? "is-on" : ""} />
          ))}
        </div>
        {step === 5 ? (
          <div className="feedback-banner info" role="status">
            <p><strong>Account created.</strong></p>
            <p style={{ marginTop: 8 }}>
              Check your inbox for a confirmation email, and click the link in
              it — you won&apos;t be able to log in until you do.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {step === 0 && (
              <>
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
                <label htmlFor="password">Password</label>
                <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
              </>
            )}
            {step === 1 && (
              <>
                <label htmlFor="firstName">First name</label>
                <input id="firstName" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                <label htmlFor="country">Country</label>
                <input id="country" required value={form.country} onChange={(e) => set("country", e.target.value)} />
                <label htmlFor="role">Role</label>
                <select id="role" value={form.professionRole} onChange={(e) => set("professionRole", e.target.value as (typeof ROLES)[number])}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            {step === 2 && (
              <>
                <label htmlFor="level">Current CEFR estimate</label>
                <select id="level" value={form.englishLevel} onChange={(e) => set("englishLevel", e.target.value as (typeof LEVELS)[number])}>
                  {LEVELS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            {step === 3 && (
              <>
                <label htmlFor="goal">Goal</label>
                <select id="goal" value={form.learningGoal} onChange={(e) => set("learningGoal", e.target.value as (typeof GOALS)[number])}>
                  {GOALS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <label htmlFor="deadline">Deadline</label>
                <select id="deadline" value={form.goalDeadline} onChange={(e) => set("goalDeadline", e.target.value as (typeof DEADLINES)[number])}>
                  {DEADLINES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            {step === 4 && (
              <>
                <p>You must be 16 or older. By continuing you accept the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link> and <Link href="/ai-usage">Responsible AI Policy</Link>.</p>
                <label>
                  <input type="checkbox" checked={form.accepted} onChange={(e) => set("accepted", e.target.checked)} /> I am 16 or older and I accept.
                </label>
              </>
            )}
            {error ? <p className="err" role="alert">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 16 }}>
              {step < 4 ? "Continue" : busy ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
        <p style={{ marginTop: 20 }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
        </div>
      </main>
    </>
  );
}
