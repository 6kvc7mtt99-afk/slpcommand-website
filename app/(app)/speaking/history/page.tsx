import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { backendJson } from "@/lib/server/backend";

/**
 * Dates arrive as ISO strings. The old page printed `.slice(0, 10)`,
 * which shows a learner "2026-08-14". This formats the same value for
 * reading, and falls back to the raw string if it will not parse
 * rather than showing an empty cell.
 */
function formatDate(raw: string): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default async function SpeakingHistoryPage() {
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/speaking/history",
    search: "?limit=50",
    cache: "no-store",
  });
  const failed = result.status >= 400;
  const items = !failed && Array.isArray(result.data?.items) ? result.data.items.filter(isRecord) : [];

  return (
    <div className="records page-skill skill-speaking">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Speaking</p>
        <h1 className="p-hero-title">Past attempts</h1>
        <p className="p-lead">
          {failed
            ? "History is unavailable right now. Nothing has been lost — this screen simply cannot reach it."
            : items.length
              ? "Every recording you have submitted, newest first, with the band it was awarded where one was given."
              : "No recordings yet. Your first attempt will appear here once it has been assessed."}
        </p>
      </header>

      {items.length ? (
        <section className="records-group" data-reveal>
          <ul className="records-list">
            {items.map((item) => {
              const audio = asString(item.audio_url, asString(item.audioUrl));
              const band = asString(item.stanag_band);
              const mode = asString(item.mode);
              const created = formatDate(asString(item.created_at, asString(item.createdAt)));
              return (
                <li className="records-row" key={asString(item.id)}>
                  <div className="records-row-main">
                    <strong>{asString(item.prompt_title, asString(item.promptTitle, "Attempt"))}</strong>
                    <p className="records-meta">
                      {mode ? <span>{mode}</span> : null}
                      {created ? <span>{created}</span> : null}
                      {/* No band is a real outcome for a formative attempt, not a
                          missing value — so it says that rather than "band none". */}
                      <span>{band ? `SLP ${band}` : "no band awarded"}</span>
                    </p>
                  </div>
                  {audio ? (
                    <div className="records-audio">
                      <audio controls preload="none" src={audio} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="records-back">
        <Link href="/speaking">Back to Speaking</Link>
      </p>
    </div>
  );
}
