"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { interpretEntitlements, planLabel, type EntitlementsSnapshot } from "@/lib/entitlements";

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("3");
  const [plan, setPlan] = useState("SLP Command Free");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()) as { email?: string };
      setEmail(me.email ?? null);
      try {
        const profile = await apiRequest<{ target_level?: string }>("/profile");
        const raw = profile.target_level ?? "3";
        setLevel(raw === "2+" ? "3" : raw);
      } catch {
        /* keep default */
      }
      try {
        const snap = await apiRequest<EntitlementsSnapshot>("/entitlements");
        setPlan(planLabel(interpretEntitlements(200, snap)));
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 404;
        setPlan(planLabel(interpretEntitlements(status, null)));
      }
    })();
  }, []);

  async function saveLevel(next: "2" | "3") {
    setLevel(next);
    try {
      await apiRequest("/profile", { method: "PATCH", body: { target_level: next } });
      setNote("Target level saved.");
    } catch {
      setNote("Could not save target level.");
    }
  }

  return (
    <section>
      <p className="section-eyebrow">Account</p>
      <h1>Profile</h1>
      <p><strong>Email</strong><br />{email ?? "—"}</p>
      <p><strong>Plan</strong><br />{plan}</p>
      <p className="muted">Subscriptions are managed in the iOS app until web billing exists.</p>
      <h2>Target level</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <button className={level === "2" ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={() => saveLevel("2")}>SLP 2</button>
        <button className={level === "3" ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={() => saveLevel("3")}>SLP 3</button>
      </div>
      {note ? <p>{note}</p> : null}
    </section>
  );
}
