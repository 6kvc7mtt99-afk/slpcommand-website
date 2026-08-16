"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminDeniedCopy, adminDownload, adminRequest, isAdminDenied } from "@/lib/api/admin";
import { asList, asRecord } from "@/lib/admin/format";
import { AdminMetrics } from "./AdminMetrics";
import { AdminCompare, AdminCorpus, AdminDiagnose, AdminRecovery, AdminSimulator, AdminStartup, AdminTransition } from "./AdminOps";
import { AdminPE } from "./AdminPE";
import { AdminSimple } from "./AdminSimple";
import { AdminTrainer } from "./AdminTrainer";
import { AdminV2 } from "./AdminV2";
import { AdminWritingEval } from "./AdminWritingEval";

type Mode = "simple" | "advanced";
type Gate = "checking" | "login" | "denied" | "ready";

const MODE_KEY = "adminViewMode";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "simple" ? "simple" : "advanced";
  } catch {
    return "advanced";
  }
}

async function settled<T>(promise: Promise<T>): Promise<T | { __error: string }> {
  try {
    return await promise;
  } catch (error) {
    return { __error: error instanceof Error ? error.message : "unavailable" };
  }
}

export function AdminConsole() {
  const [gate, setGate] = useState<Gate>("checking");
  const [denied, setDenied] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("advanced");
  const [core, setCore] = useState<Record<string, unknown> | null>(null);
  const [v2, setV2] = useState<unknown>(null);
  const [startup, setStartup] = useState<unknown>(null);
  const [recovery, setRecovery] = useState<unknown>(null);
  const [compare, setCompare] = useState<unknown>(null);
  const [transition, setTransition] = useState<unknown>(null);
  const [corpus, setCorpus] = useState<unknown>(null);
  const [diagnoseVerdict, setDiagnoseVerdict] = useState("Not run yet.");
  const [diagnose, setDiagnose] = useState<unknown>(null);
  const [trainerLearners, setTrainerLearners] = useState<unknown[]>([]);
  const [trainerHint, setTrainerHint] = useState("");
  const [trainerUser, setTrainerUser] = useState("");
  const [trainerMinutes, setTrainerMinutes] = useState("25");
  const [trainerPayload, setTrainerPayload] = useState<unknown>(null);
  const [trainerLoading, setTrainerLoading] = useState(false);
  const [writingUser, setWritingUser] = useState("");
  const [writingLimit, setWritingLimit] = useState("50");
  const [writingPayload, setWritingPayload] = useState<unknown>(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [replayUser, setReplayUser] = useState("");
  const [replay, setReplay] = useState<unknown>(null);
  const [sim, setSim] = useState({
    correct: "15",
    incorrect: "5",
    itemLevel: "3",
    daysSinceLast: "0",
    constructs: "4",
    examItems: "1",
  });
  const [simResult, setSimResult] = useState<unknown>(null);

  const applyMode = useCallback((next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const loadCore = useCallback(async () => {
    const [users, learning, usage, health, reports, retention, deps, flags, audit, pe, ms, msListening, msWriting, msSpeaking] =
      await Promise.all([
        adminRequest("/admin/metrics/users"),
        adminRequest("/admin/metrics/learning"),
        adminRequest("/admin/metrics/usage"),
        adminRequest("/admin/metrics/health"),
        adminRequest("/admin/metrics/reports"),
        adminRequest("/admin/metrics/retention"),
        adminRequest("/admin/metrics/system-health"),
        adminRequest("/admin/feature-flags"),
        adminRequest("/admin/audit-logs?limit=30"),
        adminRequest("/admin/proficiency/dashboard?skill=reading").catch((error) => ({ __peError: error instanceof Error ? error.message : "unavailable" })),
        adminRequest("/admin/proficiency/mode-status?skill=reading").catch((error) => ({ __msError: error instanceof Error ? error.message : "unavailable" })),
        adminRequest("/admin/proficiency/mode-status?skill=listening").catch((error) => ({ __msError: error instanceof Error ? error.message : "unavailable" })),
        adminRequest("/admin/proficiency/mode-status?skill=writing").catch((error) => ({ __msError: error instanceof Error ? error.message : "unavailable" })),
        adminRequest("/admin/proficiency/mode-status?skill=speaking").catch((error) => ({ __msError: error instanceof Error ? error.message : "unavailable" })),
      ]);
    setCore({ users, learning, usage, health, reports, retention, deps, flags, audit, pe, ms, msListening, msWriting, msSpeaking });
  }, []);

  const loadOptional = useCallback(async () => {
    const [overview, boot, rec, cmp, tr, corp, learners] = await Promise.all([
      settled(adminRequest("/admin/v2/overview")),
      settled(adminRequest("/admin/v2/startup")),
      settled(adminRequest("/admin/v2/recovery")),
      settled(adminRequest("/admin/v2/compare")),
      settled(adminRequest("/admin/v2/transition")),
      settled(adminRequest("/admin/v2/corpus")),
      settled(adminRequest("/admin/trainer-pipeline")),
    ]);
    setV2("__error" in asRecord(overview) ? null : overview);
    setStartup("__error" in asRecord(boot) ? null : boot);
    setRecovery("__error" in asRecord(rec) ? null : rec);
    setCompare("__error" in asRecord(cmp) ? null : cmp);
    setTransition("__error" in asRecord(tr) ? null : tr);
    setCorpus("__error" in asRecord(corp) ? null : corp);
    if (!("__error" in asRecord(learners))) {
      const list = asList(asRecord(learners).learners);
      setTrainerLearners(list);
      setTrainerHint(`${displayCount(asRecord(learners).count, list.length)} learner${displayCount(asRecord(learners).count, list.length) === 1 ? "" : "s"} have proficiency state. Start typing, or pick from the list.`);
      setTrainerUser((current) => current || String(asRecord(list[0] ? asRecord(list[0]).userId : "") || ""));
    } else {
      setTrainerHint("Learner list unavailable.");
    }
  }, []);

  const enterConsole = useCallback(async () => {
    await loadCore();
    setGate("ready");
    await loadOptional();
  }, [loadCore, loadOptional]);

  useEffect(() => {
    applyMode(readMode());
    let cancelled = false;
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!me.ok) {
        if (!cancelled) setGate("login");
        return;
      }
      try {
        await enterConsole();
      } catch (error) {
        if (cancelled) return;
        if (isAdminDenied(error)) {
          setDenied("This account is not an administrator.");
          setGate("denied");
          return;
        }
        setDenied(adminDeniedCopy(error));
        setGate("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMode, enterConsole]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setDenied("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDenied(data.error && /admin/i.test(data.error) ? "This account is not an administrator." : data.error || "Login failed");
        return;
      }
      await enterConsole();
    } catch (error) {
      setDenied(isAdminDenied(error) ? "This account is not an administrator." : adminDeniedCopy(error));
      if (isAdminDenied(error)) setGate("denied");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setCore(null);
    setPassword("");
    setDenied("");
    setGate("login");
  }

  async function onRefresh() {
    try {
      await loadCore();
    } catch (error) {
      window.alert(adminDeniedCopy(error));
    }
  }

  async function onToggleFlag(key: string, enabled: boolean) {
    try {
      await adminRequest(`/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: { enabled },
      });
      await loadCore();
    } catch (error) {
      window.alert(`Could not update flag: ${adminDeniedCopy(error)}`);
      await loadCore();
    }
  }

  async function onSetReportStatus(id: string, status: "open" | "resolved") {
    try {
      await adminRequest(`/admin/reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status },
      });
      await loadCore();
    } catch (error) {
      window.alert(`Could not update: ${adminDeniedCopy(error)}`);
    }
  }

  async function onDiagnose() {
    setDiagnoseVerdict("Running…");
    try {
      const payload = await adminRequest<Record<string, unknown>>("/admin/v2/diagnose");
      setDiagnose(payload);
      const alerts = asRecord(payload.alerts);
      setDiagnoseVerdict(`${payload.healthy ? "healthy" : displayValueSafe(alerts.worst)} ${displayValueSafe(payload.verdict)}`);
    } catch {
      setDiagnoseVerdict("Diagnosis endpoint unavailable on this deployment.");
    }
  }

  async function onTrainer() {
    if (!trainerUser.trim()) {
      setTrainerPayload({ available: false, why: "Choose a learner first." });
      return;
    }
    setTrainerLoading(true);
    try {
      setTrainerPayload(
        await adminRequest(
          `/admin/trainer-pipeline?user=${encodeURIComponent(trainerUser.trim())}&minutes=${encodeURIComponent(trainerMinutes || "25")}`,
        ),
      );
    } catch (error) {
      setTrainerPayload({ available: false, why: adminDeniedCopy(error) });
    } finally {
      setTrainerLoading(false);
    }
  }

  async function onWriting() {
    setWritingLoading(true);
    try {
      const query = `/admin/writing-evaluation?limit=${encodeURIComponent(writingLimit || "50")}${writingUser.trim() ? `&user=${encodeURIComponent(writingUser.trim())}` : ""}`;
      setWritingPayload(await adminRequest(query));
    } catch (error) {
      setWritingPayload({ summary: { headline: adminDeniedCopy(error) }, rules: [], attempts: [] });
    } finally {
      setWritingLoading(false);
    }
  }

  async function onReplay() {
    setReplay("Replaying…");
    try {
      setReplay(await adminRequest(`/admin/v2/replay${replayUser.trim() ? `?user=${encodeURIComponent(replayUser.trim())}` : ""}`));
    } catch {
      setReplay("Replay endpoint unavailable.");
    }
  }

  async function onExport() {
    try {
      const blob = await adminDownload("/admin/v2/compare?format=csv");
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "compare-legacy-vs-v2.csv";
      link.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      window.alert(`Export failed: ${adminDeniedCopy(error)}`);
    }
  }

  async function onSimulate() {
    try {
      setSimResult(
        await adminRequest("/admin/v2/simulate", {
          method: "POST",
          body: {
            correct: Number(sim.correct),
            incorrect: Number(sim.incorrect),
            itemLevel: Number(sim.itemLevel),
            daysSinceLast: Number(sim.daysSinceLast),
            constructs: Number(sim.constructs),
            examItems: Number(sim.examItems),
          },
        }),
      );
    } catch {
      setSimResult(null);
    }
  }

  if (gate === "checking") {
    return (
      <main className="admin-login">
        <h2>Admin access</h2>
        <p className="admin-muted">Checking session…</p>
      </main>
    );
  }

  if (gate === "login" || gate === "denied") {
    return (
      <main className="admin-login">
        <h2>Admin access</h2>
        <p className="admin-muted" style={{ fontSize: 14 }}>Sign in with an administrator account.</p>
        <form onSubmit={onLogin}>
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin-err" role="alert">{denied}</p>
      </main>
    );
  }

  return (
    <div>
      <a className="admin-skip" href="#admin-main">
        Skip to content
      </a>
      <header>
        <h1>SLP Command · Operations</h1>
        <div className="admin-row">
          <button type="button" className="ghost" onClick={() => applyMode("simple")} style={{ opacity: mode === "simple" ? 1 : 0.6 }}>
            Simple
          </button>
          <button type="button" className="ghost" onClick={() => applyMode("advanced")} style={{ opacity: mode === "advanced" ? 1 : 0.6 }}>
            Advanced
          </button>
          <button type="button" className="ghost" onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main id="admin-main" className="admin-main">
        {mode === "simple" && core ? <AdminSimple data={core} /> : null}
        {mode === "advanced" && core ? (
          <>
            <div className="admin-warn">
              Crash &amp; error trends (Sentry) and product funnels (PostHog) live in their own dashboards. This panel shows platform data owned by the backend.
            </div>
            <AdminMetrics data={core} onToggleFlag={onToggleFlag} onSetReportStatus={onSetReportStatus} />
            <AdminV2 data={v2} engineering />
            <AdminStartup payload={startup} />
            <AdminDiagnose verdict={diagnoseVerdict} payload={diagnose} onRun={onDiagnose} />
            <AdminWritingEval
              userId={writingUser}
              limit={writingLimit}
              onUserId={setWritingUser}
              onLimit={setWritingLimit}
              onLoad={onWriting}
              payload={writingPayload}
              loading={writingLoading}
            />
            <AdminTrainer
              learners={trainerLearners}
              hint={trainerHint}
              userId={trainerUser}
              minutes={trainerMinutes}
              onUserId={setTrainerUser}
              onMinutes={setTrainerMinutes}
              onDiagnose={onTrainer}
              pipeline={trainerPayload}
              loading={trainerLoading}
            />
            <AdminRecovery
              recovery={recovery}
              replayUser={replayUser}
              replay={replay}
              onReplayUser={setReplayUser}
              onReplay={onReplay}
            />
            <AdminCompare payload={compare} onExport={onExport} />
            <AdminTransition payload={transition} />
            <AdminCorpus payload={corpus} />
            <AdminSimulator values={sim} onChange={(key, value) => setSim((current) => ({ ...current, [key]: value }))} onRun={onSimulate} result={simResult} engineering />
            <AdminPE
              pe={core.pe}
              ms={core.ms}
              msListening={core.msListening}
              msWriting={core.msWriting}
              msSpeaking={core.msSpeaking}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

function displayCount(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function displayValueSafe(value: unknown): string {
  return value == null ? "" : String(value);
}
