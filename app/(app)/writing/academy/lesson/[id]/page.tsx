import { AcademyLessonView } from "@/components/academy/AcademyLessonView";
import { decodeAcademyLesson } from "@/lib/api/academy";
import { StatePage } from "@/components/ui/StatePage";
import { stateFromResult } from "@/lib/server/stateFromResult";
import { backendJson } from "@/lib/server/backend";

export default async function WritingLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ why?: string }>;
}) {
  const [{ id }, { why }] = await Promise.all([params, searchParams]);
  const result = await backendJson<unknown>({
    path: `/api/writing/academy/lesson/${encodeURIComponent(id)}`,
    cache: "no-store",
  });
  const lesson = result.status < 400 ? decodeAcademyLesson(result.data) : null;
  // See the note in the Reading lesson route: one sentence for four different
  // situations, three of which it described falsely.
  const state = stateFromResult(result, { subject: "this lesson", unreadableWhen: !lesson });
  if (state) {
    return <StatePage state={state} title="Writing Academy" backHref="/writing/academy" backLabel="Back to Academy" />;
  }
  if (!lesson) return null;
  return <AcademyLessonView skill="Writing" lesson={lesson} practiceHref="/writing/practice" why={why} />;
}
