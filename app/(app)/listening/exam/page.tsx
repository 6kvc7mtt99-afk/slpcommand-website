import Link from "next/link";
import { ExerciseShell } from "@/components/exercise/ExerciseShell";

export default function ListeningExamStub() {
  return (
    <ExerciseShell skill="Listening" mode="Exam" title="Exam simulation">
      <article className="home-card">
        <p className="muted">Play authority, no-seek player and exam state ship in the next change.</p>
        <Link className="btn btn-primary" href="/listening/practice">
          Go to practice
        </Link>
      </article>
    </ExerciseShell>
  );
}
