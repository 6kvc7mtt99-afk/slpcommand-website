import Link from "next/link";
import { ExerciseShell } from "@/components/exercise/ExerciseShell";

export default function WritingExamStub() {
  return (
    <ExerciseShell skill="Writing" mode="Exam" title="Exam simulation">
      <article className="home-card">
        <p className="muted">Formative vs exam mode and the local draft ship in the next change.</p>
        <Link className="btn btn-primary" href="/writing/practice">Go to practice</Link>
      </article>
    </ExerciseShell>
  );
}
