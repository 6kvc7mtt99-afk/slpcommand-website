import { AcademyLessonView } from "@/components/academy/AcademyLessonView";
import { decodeAcademyLesson } from "@/lib/api/academy";
import { StatePage } from "@/components/ui/StatePage";
import { stateFromResult } from "@/lib/server/stateFromResult";
import { backendJson } from "@/lib/server/backend";

export default async function ReadingLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ why?: string }>;
}) {
  const [{ id }, { why }] = await Promise.all([params, searchParams]);
  const result = await backendJson<unknown>({
    path: `/api/reading/academy/lesson/${encodeURIComponent(id)}`,
    cache: "no-store",
  });
  const lesson = result.status < 400 ? decodeAcademyLesson(result.data) : null;
  /**
   * "That lesson is not in the curriculum" used to be the answer to EVERY
   * failure here — a 403, a 404, a 500, and the synthetic 504 for an
   * unreachable backend. Only the 404 was ever true.
   */
  const state = stateFromResult(result, { subject: "this lesson", unreadableWhen: !lesson });
  if (state) {
    return <StatePage state={state} title="Reading Academy" backHref="/reading/academy" backLabel="Back to Academy" />;
  }
  if (!lesson) return null;
  return <AcademyLessonView skill="Reading" lesson={lesson} practiceHref="/reading/practice" why={why} />;
}
