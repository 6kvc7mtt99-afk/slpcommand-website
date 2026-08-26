import Link from "next/link";
import { loadAcademyQuota } from "@/lib/server/academy";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { CreateAcademyForm } from "@/components/academy/CreateAcademyForm";

// FASE PLATFORM-PROVISIONING-001 — the page where an academy comes into
// existence. A Server Component, so the quota is known before the first paint
// and somebody at their limit is told so instead of discovering it by filling
// in a form and pressing a button.

export default async function NewAcademyPage() {
  // Both loads are independent; running them in parallel keeps this page's
  // time-to-first-byte to one round trip rather than two.
  const [quota, memberships] = await Promise.all([
    loadAcademyQuota(),
    loadTeacherMemberships(),
  ]);

  // A null quota means the backend could not be reached. Rendering the form
  // anyway would be the friendlier-looking choice and the wrong one: the
  // person would type everything in and then meet a failure. Saying so now is
  // shorter.
  if (!quota) {
    return (
      <main className="academy-main">
        <h1 className="academy-h1">Create an academy</h1>
        <p className="academy-error-block">
          We could not load your account just now. Refresh the page to try again.
        </p>
      </main>
    );
  }

  const existing = memberships.filter((m) => m.role === "owner");

  return (
    <main className="academy-main">
      <h1 className="academy-h1">Create an academy</h1>
      <p className="academy-sub">
        An academy is your own space in SLP Command: your teachers, your students,
        your branding, your reports. You will be its owner.
      </p>

      {quota.canCreate ? (
        <CreateAcademyForm />
      ) : (
        <div className="academy-limit-block">
          <h2 className="academy-h2">You have reached the limit</h2>
          <p>
            This account owns {quota.owned} {quota.owned === 1 ? "academy" : "academies"},
            which is the maximum of {quota.limit}. If you need another one, get in
            touch and we will sort it out with you.
          </p>
        </div>
      )}

      {existing.length > 0 && (
        <section className="academy-existing">
          <h2 className="academy-h2">Academies you own</h2>
          <ul className="academy-existing-list">
            {existing.map((m) => (
              <li key={m.organizationId}>
                <Link href={`/teacher/${m.organizationId}`}>
                  {m.organizationName ?? "Untitled organization"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
