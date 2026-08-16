import Link from "next/link";
import { ExerciseShell } from "@/components/exercise/ExerciseShell";

export default function ReadingExamStub() {
  return (
    <ExerciseShell skill="Reading" mode="Exam" title="Exam simulation">
      <article className="home-card">
        <p className="muted">
          The reading exam (start-v2, disclaimer and timer) ships in the next change. Practice is available now.
        </p>
        <Link className="btn btn-primary" href="/reading/practice">
          Go to practice
        </Link>
      </article>
    </ExerciseShell>
  );
}
