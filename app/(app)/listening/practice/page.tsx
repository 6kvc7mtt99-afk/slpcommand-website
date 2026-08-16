import { ListeningPractice } from "@/components/listening/ListeningPractice";

export default async function ListeningPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ focusSkill?: string; focusSubSkill?: string }>;
}) {
  const focus = await searchParams;
  return <ListeningPractice focusSkill={focus.focusSkill} focusSubSkill={focus.focusSubSkill} />;
}
