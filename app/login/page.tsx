"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/marketing/SiteChrome";
import { loginErrorMessage } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { userId?: string; error?: string };
      if (!res.ok) {
        setError(loginErrorMessage(res.status, res.status >= 500 || data.error === "network"));
        return;
      }
      if (typeof window !== "undefined" && data.userId) {
        const done = localStorage.getItem(`onboarding_completed:${data.userId}`);
        router.replace(done === "1" ? "/dashboard" : "/onboarding");
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError(loginErrorMessage(0, true));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap" style={{ maxWidth: 420 }}>
        <h1>Log in</h1>
        <p className="updated">Use the same email and password as the iOS app.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {error ? <p className="err" role="alert">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p style={{ marginTop: 20 }}>
          No account? <Link href="/signup">Create one</Link>
        </p>
      </main>
    </>
  );
}
