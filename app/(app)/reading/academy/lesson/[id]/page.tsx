import { AcademyLessonView, EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { decodeAcademyLesson } from "@/lib/api/academy";
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
  if (!lesson) {
    return <EmptyAcademy title="Lesson" body="No such lesson." />;
  }
  return <AcademyLessonView skill="Reading" lesson={lesson} practiceHref="/reading/practice" why={why} />;
}
