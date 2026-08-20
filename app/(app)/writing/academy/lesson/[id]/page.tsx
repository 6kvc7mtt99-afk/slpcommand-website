import { AcademyLessonView, EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { decodeAcademyLesson } from "@/lib/api/academy";
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
  if (!lesson) return <EmptyAcademy title="Lesson" body="Lesson not found." />;
  return <AcademyLessonView skill="Writing" lesson={lesson} practiceHref="/writing/practice" why={why} />;
}
