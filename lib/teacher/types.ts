// FASE TEACHER-WEB-001 — wire types for SLP Command Teacher.
//
// Every shape here mirrors what lib/teacher/{rbac,queries,intelligence}.js
// actually returns on the backend, verbatim. Nothing here is computed —
// decoding only, same discipline as lib/api/progress.ts on the student side.

export type TeacherRole = "super_admin" | "owner" | "admin" | "teacher" | "student";

export interface TeacherMembership {
  organizationId: string;
  role: TeacherRole;
  organizationName: string | null;
}

export interface TeacherMeResponse {
  ok: true;
  memberships: TeacherMembership[];
}

export interface RosterStudent {
  studentId: string;
  // PLATFORM-GROUPS-001 — the roster used to carry only the id, and the UI
  // rendered it verbatim: a teacher looking at their own class saw thirty-six
  // hex characters where a name belongs. Both are nullable and stay nullable:
  // about a third of real users have no name recorded in Auth, and the honest
  // answer there is "no name recorded", never the id dressed up as one.
  name: string | null;
  email: string | null;
  memberSince: string;
  groupId: string | null;
  groupName: string | null;
  targetLevel: string | null;
  lastActivityAt: string | null;
  lastActivityDate: string | null;
}

export interface RosterResponse {
  ok: true;
  students: RosterStudent[];
  total: number;
}

export interface StudentSummary {
  studentId: string;
  memberSince: string;
  targetLevel: string | null;
  accountCreatedAt: string | null;
}

export interface ActivityDay {
  activity_date: string;
  reading_practice_question_count: number;
  reading_exam_count: number;
  listening_practice_question_count: number;
  listening_exam_count: number;
  writing_submission_count: number;
  speaking_evaluation_count: number;
  academy_completion_count: number;
  skills_trained_count: number;
  qualifying_activity_count: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
}

export interface StudentActivityResponse {
  ok: true;
  studentId: string;
  days: number;
  activity: ActivityDay[];
}

export interface WritingAttempt {
  id: string;
  submitted_at: string;
  mode: string | null;
  task_type: string | null;
  topic: string | null;
  target_level: string | null;
  estimated_level: string | null;
  overall_score: number | null;
  task_score: number | null;
  content_score: number | null;
  language_score: number | null;
  strengths: unknown;
  weaknesses: unknown;
  critical_errors: unknown;
  recurrent_errors: unknown;
  status: string;
}

export interface StudentWritingResponse {
  ok: true;
  studentId: string;
  attempts: WritingAttempt[];
}

export interface ProficiencySkillState {
  skill: string;
  theta: number | null;
  sigma2: number | null;
  n_events: number;
  last_event_at: string | null;
}

export interface StudentProficiencyResponse {
  ok: true;
  studentId: string;
  skills: ProficiencySkillState[];
}

export interface SpeakingAttempt {
  id: string;
  created_at: string;
  fluency_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  coherence_score: number | null;
  task_achievement_score: number | null;
  ratable: boolean | null;
}

export interface StudentSpeakingResponse {
  ok: true;
  studentId: string;
  attempts: SpeakingAttempt[];
}

export type RiskStatus = "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL";

export interface StudentRisk {
  status: RiskStatus;
  reason: string;
  idleDays: number | null;
}

export interface DiagnosisFinding {
  id: string;
  observed: string;
  calculated: string;
  recommended: string;
}

export interface StudentDiagnosisResponse {
  ok: true;
  risk: StudentRisk;
  findings: DiagnosisFinding[];
}

export interface AlertStudent extends RosterStudent {
  risk: StudentRisk;
}

export interface AlertsResponse {
  ok: true;
  students: AlertStudent[];
  totalStudents: number;
}

// FASE TEACHER-GROUPS-001 — groups + secure invitations. Group objects mirror
// lib/teacher/groups.js's own return shape verbatim (created_at stays
// snake_case, same convention as WritingAttempt/SpeakingAttempt above).
export interface TeacherGroup {
  id: string;
  name: string;
  created_at: string;
  studentCount: number;
}

export interface GroupsResponse {
  ok: true;
  groups: TeacherGroup[];
  unassignedCount: number;
}

export interface CreatedInvite {
  id: string;
  role: TeacherRole;
  /** null = link-only. */
  email: string | null;
  expiresAt: string;
  /** Returned EXACTLY once. Also present when delivery failed, so the link
   *  can still be copied by hand rather than being lost. */
  token: string;
  url: string;
}

export interface CreateInviteResponse {
  ok: true;
  invite: CreatedInvite;
  // PLATFORM-MAIL-001 — the honest half of the answer. The invitation was
  // created either way; this says whether the email went. "created but not
  // sent" is a real, recoverable outcome and never reported as success.
  delivery: {
    status: "not_requested" | "pending" | "sent" | "failed";
    retriable?: boolean;
    error?: string | null;
    messageId?: string | null;
  };
}

export interface ResendInviteResponse {
  ok: true;
  delivery: CreateInviteResponse["delivery"];
}

export interface AcceptInviteResponse {
  ok: true;
  organizationId: string;
  role: TeacherRole;
}
