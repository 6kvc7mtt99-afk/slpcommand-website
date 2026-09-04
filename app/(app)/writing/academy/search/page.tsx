import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { StatePage } from "@/components/ui/StatePage";
import { stateFromResult } from "@/lib/server/stateFromResult";
import { backendJson } from "@/lib/server/backend";

export default async function WritingAcademySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const form = (
    <form className="records-search" role="search">
      <label className="sr-only" htmlFor="q">
        Search writing lessons
      </label>
      <input id="q" name="q" type="search" placeholder="Search the writing library" defaultValue={q ?? ""} />
      <button className="btn btn-primary" type="submit">
        Search
      </button>
    </form>
  );

  if (!q) {
    return (
      <div className="records page-skill skill-writing">
        <header className="records-head" data-enter>
          <p className="p-eyebrow is-skill">Writing Academy</p>
          <h1 className="p-hero-title">Writing library</h1>
          <p className="p-lead">
            Every writing class in the curriculum, searchable. The Academy already picks one for you each day — this is
            for when you want a specific one.
          </p>
          {form}
        </header>
        <p className="records-back">
          <Link href="/writing/academy">Back to Writing Academy</Link>
        </p>
      </div>
    );
  }

  const result = await backendJson<Record<string, unknown>>({
    path: "/api/writing/academy/search",
    search: `?q=${encodeURIComponent(q)}`,
    cache: "no-store",
  });
  // A 403 here is a plan boundary, not an outage — reporting it as "could not
  // be loaded" told a Free learner the product was broken when it was working
  // exactly as sold. stateFromResult keeps those two apart.
  const state = stateFromResult(result, { subject: "the library", unreadableWhen: !result.data });
  if (state) return <StatePage state={state} title="Writing Academy" backHref="/writing/academy" backLabel="Back to Academy" />;
  if (!result.data) return null;
  const lessons = (Array.isArray(result.data.lessons) ? result.data.lessons : []).filter(isRecord);
  const count = Number(asString(result.data.count, String(lessons.length))) || lessons.length;

  return (
    <div className="records page-skill skill-writing">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Writing Academy</p>
        <h1 className="p-hero-title">Writing library</h1>
        <p className="p-lead">
          {count === 0
            ? `Nothing in the curriculum matches “${q}”.`
            : `${count} ${count === 1 ? "class matches" : "classes match"} “${q}”.`}
        </p>
        {form}
      </header>

      {lessons.length ? (
        <section className="records-group" data-reveal>
          <ul className="records-list">
            {lessons.map((lesson) => {
              const id = asString(lesson.id);
              const objective = asString(lesson.learningObjective, asString(lesson.objective));
              return (
                <li className="records-row" key={id}>
                  <div className="records-row-main">
                    <strong>
                      <Link href={`/writing/academy/lesson/${encodeURIComponent(id)}`}>{asString(lesson.title)}</Link>
                    </strong>
                    {objective ? <p className="records-meta">{objective}</p> : null}
                  </div>
                  <Link className="records-row-go" href={`/writing/academy/lesson/${encodeURIComponent(id)}`}>
                    Open the class
                    <span className="p-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="records-back">
        <Link href="/writing/academy">Back to Writing Academy</Link>
      </p>
    </div>
  );
}
