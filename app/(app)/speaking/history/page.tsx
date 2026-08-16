import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { backendJson } from "@/lib/server/backend";

export default async function SpeakingHistoryPage() {
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/speaking/history",
    search: "?limit=50",
    cache: "no-store",
  });
  const items = result.status < 400 && Array.isArray(result.data?.items) ? result.data.items : [];
  return (
    <section className="exercise">
      <p className="section-eyebrow">Speaking</p>
      <h1>History</h1>
      {result.status >= 400 ? <p className="muted">History is unavailable right now.</p> : null}
      <ul className="home-blocks">
        {items.filter(isRecord).map((item) => (
          <li key={asString(item.id)}>
            <strong>{asString(item.prompt_title, asString(item.promptTitle, "Attempt"))}</strong>
            <p className="muted">
              {asString(item.mode)} · {asString(item.created_at, asString(item.createdAt)).slice(0, 10)} · band {asString(item.stanag_band) || "none"}
            </p>
            {asString(item.audio_url, asString(item.audioUrl)) ? (
              <audio controls src={asString(item.audio_url, asString(item.audioUrl))} />
            ) : null}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/speaking">Back to Speaking</Link>
      </p>
    </section>
  );
}
