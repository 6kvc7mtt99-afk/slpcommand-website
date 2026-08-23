// Human labels for the role hierarchy. One place, so a rename never drifts
// between the picker, the shell header, and any future settings screen.
import type { TeacherRole } from "./types";

export const STAFF_ROLE_LABELS: Record<TeacherRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};
