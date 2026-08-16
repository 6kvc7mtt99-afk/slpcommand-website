"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(level: "2" | "3") {
    setBusy(true);
    setError("");
    try {
      await apiRequest("/profile", { method: "PATCH", body: { target_level: level } });
      const me = await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()) as { userId?: string };
      if (me.userId) localStorage.setItem(`onboarding_completed:${me.userId}`, "1");
      router.replace("/dashboard");
    } catch {
      setError("Could not save your target level. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 520 }}>
      <h1>Choose your target level</h1>
      <p>SLP Command trains SLP Level 2 and SLP Level 3. Pick the band you are preparing for. You can change this later in Profile.</p>
      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button className="btn btn-outline" disabled={busy} onClick={() => choose("2")}>SLP 2</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => choose("3")}>SLP 3</button>
      </div>
      {error ? <p className="err" role="alert">{error}</p> : null}
    </main>
  );
}
