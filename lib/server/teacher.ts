// FASE TEACHER-WEB-001 — server-side data loaders for SLP Command Teacher.
// Same shape as lib/server/home.ts's loadEntitlements/loadProgress: fetch via
// backendJson (which carries the httpOnly session cookie through
// lib/server/backend.ts), return null on any non-2xx rather than throwing —
// a Server Component decides what "no data" looks like, this file never
// invents a placeholder.

import { cache } from "react";
import { backendJson } from "./backend";
import type {
  TeacherMeResponse, RosterResponse, StudentSummary, StudentActivityResponse,
  StudentWritingResponse, StudentProficiencyResponse, StudentSpeakingResponse,
  StudentDiagnosisResponse, AlertsResponse, TeacherMembership, GroupsResponse,
} from "@/lib/teacher/types";

/**
 * The caller's real, active memberships. `cache()`-wrapped so every Server
 * Component on a Teacher page reads this once per request, not once per
 * component — same reasoning as loadEntitlements.
 */
export const loadTeacherMemberships = cache(async (): Promise<TeacherMembership[]> => {
  const result = await backendJson<TeacherMeResponse>({ path: "/api/teacher/me", cache: "no-store" });
  if (result.status !== 200 || !result.data) return [];
  return result.data.memberships;
});

/** True iff the caller has ANY staff role (owner/admin/teacher/super_admin) anywhere. */
export async function hasTeacherAccess(): Promise<boolean> {
  const memberships = await loadTeacherMemberships();
  return memberships.length > 0; // GET /api/teacher/me itself is staff-only — see server.js.
}

export const loadOrganizationStudents = cache(
  async (
    organizationId: string,
    params?: { limit?: number; offset?: number; groupId?: string },
  ): Promise<RosterResponse | null> => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    if (params?.groupId) search.set("groupId", params.groupId);
    const qs = search.toString();
    const result = await backendJson<RosterResponse>({
      path: `/api/teacher/organizations/${organizationId}/students`,
      search: qs ? `?${qs}` : undefined,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadOrganizationGroups = cache(
  async (organizationId: string): Promise<GroupsResponse | null> => {
    const result = await backendJson<GroupsResponse>({
      path: `/api/teacher/organizations/${organizationId}/groups`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadStudentSummary = cache(
  async (organizationId: string, studentId: string): Promise<StudentSummary | null> => {
    const result = await backendJson<{ ok: true; student: StudentSummary }>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.student ?? null) : null;
  },
);

export const loadStudentActivity = cache(
  async (organizationId: string, studentId: string, days = 30): Promise<StudentActivityResponse | null> => {
    const result = await backendJson<StudentActivityResponse>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}/activity`,
      search: `?days=${days}`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadStudentWriting = cache(
  async (organizationId: string, studentId: string): Promise<StudentWritingResponse | null> => {
    const result = await backendJson<StudentWritingResponse>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}/writing`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadStudentProficiency = cache(
  async (organizationId: string, studentId: string): Promise<StudentProficiencyResponse | null> => {
    const result = await backendJson<StudentProficiencyResponse>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}/proficiency`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadStudentSpeaking = cache(
  async (organizationId: string, studentId: string): Promise<StudentSpeakingResponse | null> => {
    const result = await backendJson<StudentSpeakingResponse>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}/speaking`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadStudentDiagnosis = cache(
  async (organizationId: string, studentId: string): Promise<StudentDiagnosisResponse | null> => {
    const result = await backendJson<StudentDiagnosisResponse>({
      path: `/api/teacher/organizations/${organizationId}/students/${studentId}/diagnosis`,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);

export const loadOrganizationAlerts = cache(
  async (organizationId: string, limit?: number): Promise<AlertsResponse | null> => {
    const result = await backendJson<AlertsResponse>({
      path: `/api/teacher/organizations/${organizationId}/alerts`,
      search: limit ? `?limit=${limit}` : undefined,
      cache: "no-store",
    });
    return result.status === 200 ? result.data : null;
  },
);
