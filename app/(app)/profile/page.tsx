"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { interpretEntitlements, planLabel, type EntitlementsSnapshot } from "@/lib/entitlements";
import { CommercialDialog } from "@/components/exercise/CommercialDialog";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("3");
  const [plan, setPlan] = useState("SLP Command Free");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [commercial, setCommercial] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()) as { email?: string; userId?: string };
      setEmail(me.email ?? null);
      setUserId(me.userId ?? null);
      try {
        const profile = await apiRequest<{ target_level?: string }>("/profile");
        const raw = profile.target_level ?? "3";
        setLevel(raw === "2+" ? "3" : raw === "2" ? "2" : "3");
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
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setCommercial(true);
        return;
      }
      setNote("Could not save target level.");
    }
  }

  async function exportData(retried = false) {
    setNote("");
    try {
      const res = await fetch("/api/backend/account/export", {
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-SLP-Client": "web" },
      });
      if (res.status === 401 && !retried) {
        const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
        if (refreshed.ok) return exportData(true);
      }
      if (!res.ok) {
        setNote("Could not export your account data.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "slp-command-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setNote("Export downloaded.");
    } catch {
      setNote("Could not export your account data.");
    }
  }

  async function requestReport() {
    try {
      await apiRequest("/reports", { method: "POST", body: { source: "web", kind: "account" } });
      setNote("Report request sent.");
    } catch {
      setNote("Could not request a report.");
    }
  }

  async function deleteAccount() {
    if (confirmDelete !== "DELETE") {
      setNote("Type DELETE to confirm.");
      return;
    }
    try {
      await apiRequest("/account", { method: "DELETE" });
      if (userId) {
        localStorage.removeItem(`onboarding_completed:${userId}`);
        localStorage.removeItem(`weekly_goal_days:${userId}`);
        localStorage.removeItem(`target_exam_date:${userId}`);
        localStorage.removeItem(`writing_exam_autosave:${userId}`);
      }
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      router.replace("/login");
    } catch {
      setNote("Account deletion failed. Email support@slpcommand.com.");
    }
  }

  return (
    <section className="exercise">
      <header className="page-head">
        <p className="section-eyebrow">Account</p>
        <h1>Profile</h1>
      </header>
      <article className="home-card">
        <p><strong>Email</strong><br />{email ?? "—"}</p>
        <p><strong>Plan</strong><br />{plan}</p>
        <p className="muted">Subscriptions are managed in the iOS app until web billing exists.</p>
      </article>
      <article className="home-card">
        <h2>Target level</h2>
        <p className="muted">Picker is SLP 2 or SLP 3 only.</p>
        <div className="cta-row">
          <button className={level === "2" ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={() => saveLevel("2")}>SLP 2</button>
          <button className={level === "3" ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={() => saveLevel("3")}>SLP 3</button>
        </div>
      </article>
      <article className="home-card">
        <h2>Your data</h2>
        <div className="cta-row">
          <button className="btn btn-outline" type="button" onClick={() => void exportData()}>Export account</button>
          <button className="btn btn-outline" type="button" onClick={() => void requestReport()}>Request report</button>
        </div>
      </article>
      <article className="home-card">
        <h2>Delete account</h2>
        <p className="muted">This goes through the same-origin proxy. Type DELETE to confirm.</p>
        <label htmlFor="delete-confirm">Confirmation</label>
        <input id="delete-confirm" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} />
        <button className="btn btn-outline" type="button" onClick={() => void deleteAccount()}>Delete account</button>
      </article>
      {note ? <p role="status">{note}</p> : null}
      <CommercialDialog open={commercial} onClose={() => setCommercial(false)} />
    </section>
  );
}
