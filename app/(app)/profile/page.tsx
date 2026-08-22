"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { interpretEntitlements, isEntitledToPro, planLabel, type EntitlementsSnapshot } from "@/lib/entitlements";
import { CommercialDialog } from "@/components/exercise/CommercialDialog";
import { greetingNameFromEmail } from "@/lib/displayName";
import {
  clampWeeklyGoal,
  readLocalPrefs,
  writeExamDate,
  writeSessionMinutes,
  writeWeeklyGoal,
  WEEKLY_GOAL_DEFAULT,
} from "@/lib/home/prefs";
import { clampSessionMinutes, DEFAULT_SESSION_MINUTES, MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from "@/lib/api/sessionToday";

/**
 * Settings.
 *
 * The previous screen was four legacy cards in a 2x2 grid: target
 * level, plan name, two data buttons, and delete. Three real problems,
 * all of them information architecture rather than styling:
 *
 *  1. Training preferences that already exist and are already honoured
 *     (weekly goal, target exam date, session length — see
 *     lib/home/prefs.ts) were reachable only from a collapsed
 *     <details> on Home. They are settings; they belong here too.
 *  2. The entitlements response carries per-feature `quota` objects
 *     with real limit/remaining/period values. Profile fetched that
 *     response and used one field from it — the plan's name — and
 *     discarded the rest, so a learner could not see what they had
 *     left on their plan anywhere in the product.
 *  3. Speaking's AI-processing consent was recordable but never
 *     revocable: the key was written on first use and only cleared by
 *     logging out. Consent you cannot withdraw is not consent.
 *
 * Everything rendered here is a setting the product can actually
 * honour. Preferences the product does not implement (notifications,
 * a theme override, audio defaults) are named as absent rather than
 * shown as dead controls — see the notes in the Appearance group.
 */

type QuotaFeature = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  quota: { period: string; limit: number | null; remaining: number | null } | null;
};

type PlanInfo = { name: string; description: string } | null;

function isRec(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The response documents a `name` per feature, but not every plan sends
 * one. Falling back to the raw key would print `writing_ai_feedback` at
 * a learner — so the key is turned into words instead. This renames
 * nothing and infers nothing: it is the same identifier, spelled for a
 * human.
 */
function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  if (!words) return "";
  return words
    .replace(/\bai\b/gi, "AI")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Reads only fields the real response documents; anything else stays absent. */
function decodeFeatures(snapshot: unknown): QuotaFeature[] {
  if (!isRec(snapshot) || !Array.isArray(snapshot.features)) return [];
  return snapshot.features.filter(isRec).map((f) => {
    const q = isRec(f.quota) ? f.quota : null;
    const key = String(f.key ?? "");
    return {
      key,
      name: String(f.name ?? "") || humanizeKey(key),
      description: String(f.description ?? ""),
      enabled: f.enabled !== false,
      quota: q
        ? {
            period: String(q.period ?? ""),
            limit: typeof q.limit === "number" ? q.limit : null,
            remaining: typeof q.remaining === "number" ? q.remaining : null,
          }
        : null,
    };
  });
}

function decodePlan(snapshot: unknown): PlanInfo {
  if (!isRec(snapshot) || !isRec(snapshot.plan)) return null;
  const name = String(snapshot.plan.name ?? "");
  if (!name) return null;
  return { name, description: String(snapshot.plan.description ?? "") };
}

const GROUPS = [
  { id: "training", label: "Training" },
  { id: "plan", label: "Plan & usage" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Privacy & data" },
  { id: "account", label: "Account" },
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [levelError, setLevelError] = useState(false);
  const [plan, setPlan] = useState("SLP Command Free");
  const [isPro, setIsPro] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo>(null);
  const [features, setFeatures] = useState<QuotaFeature[]>([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [commercial, setCommercial] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(WEEKLY_GOAL_DEFAULT);
  const [examDate, setExamDate] = useState("");
  const [minutes, setMinutes] = useState(DEFAULT_SESSION_MINUTES);
  const [speechConsent, setSpeechConsent] = useState(false);

  useEffect(() => {
    (async () => {
      const me = (await fetch("/api/auth/me", { credentials: "same-origin" })
        .then((r) => r.json())
        .catch(() => ({}))) as { email?: string; userId?: string };
      setEmail(me.email ?? null);
      setUserId(me.userId ?? null);
      if (me.userId) {
        const local = readLocalPrefs(me.userId);
        setWeeklyGoal(local.weeklyGoalDays);
        setExamDate(local.targetExamDate);
        setMinutes(local.minutes);
        try {
          setSpeechConsent(localStorage.getItem(`speaking_ai_consent_given:${me.userId}`) === "1");
        } catch {
          /* private mode */
        }
      }
      try {
        const profile = await apiRequest<{ target_level?: string }>("/profile");
        const raw = profile.target_level ?? "3";
        setLevel(raw === "2+" ? "3" : raw === "2" ? "2" : "3");
      } catch {
        setLevelError(true);
      }
      try {
        const snap = await apiRequest<EntitlementsSnapshot>("/entitlements");
        // apiRequest throws on non-2xx, so a value here IS a successful read.
        const state = interpretEntitlements(200, snap);
        setPlan(planLabel(state));
        setIsPro(isEntitledToPro(state));
        setPlanInfo(decodePlan(snap));
        setFeatures(decodeFeatures(snap));
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 404;
        const state = interpretEntitlements(status, null);
        setPlan(planLabel(state));
        setIsPro(isEntitledToPro(state));
      } finally {
        setPlanLoaded(true);
      }
    })();
  }, []);

  const saveLevel = useCallback(async (next: "2" | "3") => {
    setLevel(next);
    setLevelError(false);
    try {
      await apiRequest("/profile", { method: "PATCH", body: { target_level: next } });
      setNote(`Target level set to SLP ${next}.`);
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setCommercial(true);
        return;
      }
      setNote("Could not save target level.");
    }
  }, []);

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

  function revokeSpeechConsent() {
    if (!userId) return;
    try {
      localStorage.removeItem(`speaking_ai_consent_given:${userId}`);
      setSpeechConsent(false);
      setNote("Speaking consent withdrawn. You will be asked again next time.");
    } catch {
      setNote("Could not update consent on this device.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
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

  const displayName = greetingNameFromEmail(email);
  const metered = features.filter((f) => f.quota && f.quota.limit != null);

  return (
    <div className="settings">
      <header className="p-hero p-profile-hero" data-enter>
        <div>
          <p className="p-eyebrow">Settings</p>
          <h1 className="p-hero-title">{displayName ?? "Your account"}</h1>
          <p className="p-lead">
            {email ?? "—"} · {plan}
          </p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-rail" aria-label="Settings sections">
          {GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className={g.id === "account" ? "is-danger" : undefined}>
              {g.label}
            </a>
          ))}
        </nav>

        <div className="settings-body">
          <section className="settings-group" id="training" data-reveal>
            <div className="settings-group-head">
              <h2>Training</h2>
              <p>These shape what the Academy recommends and how long each session is planned to run.</p>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Target level</strong>
                <p>
                  The band you are preparing for. Every Academy recommendation and readiness reading is measured
                  against this.
                  {levelError ? " Couldn’t load your saved level — pick one to set it." : ""}
                </p>
              </div>
              <div className="settings-row-control">
                <div className="settings-seg" role="group" aria-label="Target level">
                  <button type="button" aria-pressed={level === "2"} onClick={() => void saveLevel("2")}>
                    SLP 2
                  </button>
                  <button type="button" aria-pressed={level === "3"} onClick={() => void saveLevel("3")}>
                    SLP 3
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Practice days each week</strong>
                <p>Used to pace your training plan. Stored on this device.</p>
              </div>
              <div className="settings-row-control">
                <select
                  aria-label="Practice days each week"
                  value={weeklyGoal}
                  onChange={(e) => {
                    const days = clampWeeklyGoal(e.target.value);
                    setWeeklyGoal(days);
                    if (userId) writeWeeklyGoal(userId, days);
                  }}
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} days
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Session length</strong>
                <p>How long a planned session should run, in minutes. Stored on this device.</p>
              </div>
              <div className="settings-row-control">
                <input
                  type="number"
                  aria-label="Preferred session length in minutes"
                  min={MIN_SESSION_MINUTES}
                  max={MAX_SESSION_MINUTES}
                  value={minutes}
                  onChange={(e) => {
                    const next = clampSessionMinutes(e.target.value);
                    setMinutes(next);
                    writeSessionMinutes(next);
                  }}
                />
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Target exam date</strong>
                <p>Optional. Stored on this device, and used to frame how much time you have left.</p>
              </div>
              <div className="settings-row-control">
                <input
                  type="date"
                  aria-label="Target exam date"
                  value={examDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    if (userId) writeExamDate(userId, e.target.value);
                  }}
                />
              </div>
            </div>
          </section>

          <section className="settings-group" id="plan" data-reveal>
            <div className="settings-group-head">
              <h2>Plan &amp; usage</h2>
              <p>What your plan includes, and what is left on it.</p>
            </div>

            <div className="settings-plan">
              <strong>{planInfo?.name || plan}</strong>
              {planInfo?.description ? <span>{planInfo.description}</span> : null}
            </div>

            {metered.length ? (
              <ul className="settings-quotas">
                {metered.map((f) => {
                  const limit = f.quota!.limit!;
                  const remaining = f.quota!.remaining;
                  const used = remaining == null ? null : Math.max(0, limit - remaining);
                  const pct = used == null || limit <= 0 ? 0 : Math.min(100, (used / limit) * 100);
                  return (
                    <li key={f.key} className="settings-quota">
                      <span className="settings-quota-name">
                        {f.name}
                        {f.description ? <em>{f.description}</em> : null}
                      </span>
                      <span className={`settings-meter${remaining === 0 ? " is-out" : ""}`} aria-hidden="true">
                        <i style={{ width: `${pct}%` }} />
                      </span>
                      <span className="settings-quota-val p-num">
                        {remaining == null ? (
                          <>
                            <b>{limit}</b> {f.quota!.period || "per period"}
                          </>
                        ) : (
                          <>
                            <b>{remaining}</b> of {limit} left
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : planLoaded ? (
              <p className="settings-note">
                Your plan does not report per-feature limits, so there is nothing to meter here. Where an action is
                unavailable, the screen that offers it says so at the point of use.
              </p>
            ) : null}

            {!isPro ? (
              <p className="settings-note">
                <a className="btn btn-primary" href="/subscription">Open plan</a>
              </p>
            ) : null}
          </section>

          <section className="settings-group" id="appearance" data-reveal>
            <div className="settings-group-head">
              <h2>Appearance &amp; motion</h2>
              <p>Both follow your system settings today. Neither is overridable in the product yet.</p>
            </div>
            <p className="settings-note">
              <strong>Theme.</strong> Light and dark are both fully designed, and the product follows whichever your
              operating system or browser is set to. There is no in-product override yet.
            </p>
            <p className="settings-note">
              <strong>Motion.</strong> If your system asks for reduced motion, every animation in the product —
              including the readiness instrument — is disabled or reduced to a single static frame. There is no
              separate switch here, because the system setting is already honoured.
            </p>
          </section>

          <section className="settings-group" id="privacy" data-reveal>
            <div className="settings-group-head">
              <h2>Privacy &amp; data</h2>
              <p>What you have agreed to, and how to take your data out.</p>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Speaking assessment consent</strong>
                <p>
                  {speechConsent
                    ? "You agreed to have your recordings processed for assessment. Withdrawing applies on this device and you will be asked again before your next recording."
                    : "Not given on this device. You will be asked before your first recording."}
                </p>
              </div>
              <div className="settings-row-control">
                {speechConsent ? (
                  <button className="btn btn-outline" type="button" onClick={revokeSpeechConsent}>
                    Withdraw consent
                  </button>
                ) : (
                  <span className="settings-off">Not given</span>
                )}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Export your data</strong>
                <p>Downloads everything the backend holds for your account as a JSON file.</p>
              </div>
              <div className="settings-row-control">
                <button className="btn btn-outline" type="button" onClick={() => void exportData()}>
                  Export account
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Request a report</strong>
                <p>Asks the backend to prepare an account report and send it to you.</p>
              </div>
              <div className="settings-row-control">
                <button className="btn btn-outline" type="button" onClick={() => void requestReport()}>
                  Request report
                </button>
              </div>
            </div>
          </section>

          <section className="settings-group is-danger" id="account" data-reveal>
            <div className="settings-group-head">
              <h2>Account</h2>
              <p>Signing out keeps your account. Deleting does not.</p>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Sign out</strong>
                <p>Ends this session and clears preferences stored on this device.</p>
              </div>
              <div className="settings-row-control">
                <button className="btn btn-outline" type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <strong>Delete account</strong>
                <p>Permanent. Your submissions, evidence and measured levels are removed and cannot be restored.</p>
              </div>
              <div className="settings-row-control settings-danger-confirm">
                <label htmlFor="delete-confirm" className="sr-only">
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm"
                  placeholder="Type DELETE"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                />
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={confirmDelete !== "DELETE"}
                  onClick={() => void deleteAccount()}
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>

          {note ? (
            <p className="settings-status" role="status">
              {note}
            </p>
          ) : null}
        </div>
      </div>

      <CommercialDialog open={commercial} onClose={() => setCommercial(false)} />
    </div>
  );
}
