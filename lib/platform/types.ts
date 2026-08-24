// FASE PLATFORM-TENANT-001 — wire types for the platform layer.
//
// Every shape here mirrors what lib/platform/*.js actually returns on the
// backend, verbatim. Nothing is computed here — decoding only, the same
// discipline lib/teacher/types.ts already follows.

import type { TeacherRole } from "@/lib/teacher/types";

// ── Branding and tenant identity ───────────────────────────────────────────

export interface Branding {
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  loginHeadline: string | null;
  loginSubheadline: string | null;
  supportEmail: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export type OrganizationType = "academy" | "enterprise" | "white_label";
export type DomainStatus = "none" | "pending" | "verified" | "disabled";

export interface OrganizationSettings {
  organizationId: string;
  name: string;
  slug: string | null;
  type: OrganizationType;
  status: "active" | "suspended";
  customDomain: string | null;
  customDomainStatus: DomainStatus;
  createdAt: string;
}

/**
 * What the PUBLIC resolver returns. Deliberately narrow: this is served
 * unauthenticated to render a branded login page, so its shape is a security
 * boundary — anything added here becomes public.
 */
export interface ResolvedTenant {
  organizationId: string;
  name: string;
  slug: string | null;
  type: OrganizationType;
  resolvedBy: "slug" | "domain";
  branding: Branding | null;
}

// ── Members and invitations ────────────────────────────────────────────────

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  /** null when the profile records no name — never a fabricated placeholder. */
  name: string | null;
  email: string | null;
  role: TeacherRole;
  status: "active" | "removed";
  groupId: string | null;
  groupName: string | null;
  joinedAt: string;
}

export interface OrganizationInvite {
  id: string;
  role: TeacherRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  groupId: string | null;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
  acceptedBy: string | null;
}

// ── Feature flags ──────────────────────────────────────────────────────────

export interface ResolvedFlag {
  enabled: boolean;
  /** Where the effective value came from — what makes a settings toggle honest. */
  source: "platform" | "organization";
  platformDefault: boolean | null;
}

export type ResolvedFlags = Record<string, ResolvedFlag>;

// ── Reporting ──────────────────────────────────────────────────────────────

export interface OrganizationTotals {
  readingPracticeQuestions: number;
  readingExams: number;
  listeningPracticeQuestions: number;
  listeningExams: number;
  writingSubmissions: number;
  speakingEvaluations: number;
  academyCompletions: number;
  qualifyingActivities: number;
}

export interface OrganizationOverview {
  organizationId: string;
  windowDays: number;
  groupId: string | null;
  studentCount: number;
  staffCount: number;
  groupCount: number;
  /** false means "nothing has happened yet" — an empty state, not a measured zero. */
  hasData: boolean;
  activeStudentsInWindow: number;
  studentsInactiveInWindow: number;
  /** Reported apart from `inactiveInWindow`: "never started" and "not back lately" are different facts. */
  studentsWithNoActivityEver: number;
  totals: OrganizationTotals;
  writing: {
    attempts: number;
    scoredAttempts: number;
    /** null when nothing was scored. Zero is a score; "no score" is not. */
    averageOverallScore: number | null;
  };
}

export interface ActivityTrendDay {
  date: string;
  activeStudents: number;
  qualifyingActivities: number;
}

export interface ActivityTrend {
  organizationId: string;
  windowDays: number;
  /** Only dates with real activity. Gaps are NOT filled with zeros. */
  days: ActivityTrendDay[];
}

export interface SkillProficiency {
  skill: string;
  studentCount: number;
  totalEvents: number;
  meanTheta: number;
  minTheta: number;
  maxTheta: number;
}

export interface OrganizationProficiency {
  organizationId: string;
  skills: SkillProficiency[];
}

export interface GroupBreakdownRow {
  groupId: string | null;
  /** null is the "unassigned" bucket — the API does not invent a group for it. */
  groupName: string | null;
  studentCount: number;
  activeStudentsInWindow: number;
  qualifyingActivities: number;
  writingSubmissions: number;
}

export interface GroupBreakdown {
  organizationId: string;
  days: number;
  groups: GroupBreakdownRow[];
}

// ── Audit ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  event: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  targetId: string | null;
  metadata: Record<string, string | number | boolean>;
  at: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
}
