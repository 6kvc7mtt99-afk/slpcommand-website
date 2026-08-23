import { redirect } from "next/navigation";
import Link from "next/link";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";

// Zero organizations is impossible here — TeacherLayout already redirected
// anyone with none. Exactly one is the common case and skips the picker
// entirely; more than one (a teacher on staff at two organizations) shows a
// real choice, never a fabricated one.
export default async function TeacherOrgPicker() {
  const memberships = await loadTeacherMemberships();

  if (memberships.length === 1) {
    redirect(`/teacher/${memberships[0].organizationId}`);
  }

  return (
    <main className="teacher-main" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="teacher-h1">SLP Command Teacher</h1>
      <p className="teacher-sub">Choose an organization.</p>
      <div className="teacher-cards" style={{ gridTemplateColumns: "1fr" }}>
        {memberships.map((m) => (
          <Link
            key={m.organizationId}
            href={`/teacher/${m.organizationId}`}
            className="teacher-card"
            style={{ display: "block" }}
          >
            <div className="value" style={{ fontSize: "var(--fs-section)" }}>
              {m.organizationName ?? "Untitled organization"}
            </div>
            <div className="label">{STAFF_ROLE_LABELS[m.role] ?? m.role}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
