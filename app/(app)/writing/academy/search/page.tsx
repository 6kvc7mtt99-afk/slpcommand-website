import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { backendJson } from "@/lib/server/backend";

export default async function WritingAcademySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (!q) {
    return (
      <section className="exercise">
        <h1>Writing library</h1>
        <form>
          <label htmlFor="q">Search lessons</label>
          <input id="q" name="q" defaultValue="" />
          <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>
            Search
          </button>
        </form>
      </section>
    );
  }
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/writing/academy/search",
    search: `?q=${encodeURIComponent(q)}`,
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Writing library" body="Search is unavailable right now." />;
  }
  const lessons = Array.isArray(result.data.lessons) ? result.data.lessons : [];
  return (
    <section className="exercise">
      <h1>Writing library</h1>
      <p className="muted">{asString(result.data.count, String(lessons.length))} matches</p>
      <ul>
        {lessons.filter(isRecord).map((lesson) => (
          <li key={asString(lesson.id)}>
            <Link href={`/writing/academy/lesson/${encodeURIComponent(asString(lesson.id))}`}>{asString(lesson.title)}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
