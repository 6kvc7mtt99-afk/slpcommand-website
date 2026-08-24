// FASE PLATFORM-TENANT-001 — server-side data loaders for the platform layer.
//
// Same shape and same discipline as lib/server/teacher.ts: fetch through
// backendJson (which carries the httpOnly session cookie), return null on any
// non-2xx rather than throwing, and never invent a placeholder — a Server
// Component decides what "no data" looks like.
//
// `cache()`-wrapped so each is read once per request rather than once per
// component that needs it.

import { cache } from "react";
import { backendJson } from "./backend";
import type {
  Branding, OrganizationSettings, OrganizationMember, OrganizationInvite,
  ResolvedFlags, OrganizationOverview, ActivityTrend, OrganizationProficiency,
  GroupBreakdown, AuditPage, ResolvedTenant,
} from "@/lib/platform/types";

export const loadOrganizationSettings = cache(
  async (organizationId: string): Promise<{ settings: OrganizationSettings; branding: Branding | null } | null> => {
    const result = await backendJson<{ ok: true; settings: OrganizationSettings; branding: Branding | null }>({
      path: `/api/teacher/organizations/${organizationId}/settings`,
      cache: "no-store",
    });
    if (result.status !== 200 || !result.data) return null;
    return { settings: result.data.settings, branding: result.data.branding };
  },
);

export const loadOrganizationBranding = cache(
  async (organizationId: string): Promise<Branding | null> => {
    const result = await backendJson<{ ok: true; branding: Branding | null }>({
      path: `/api/teacher/organizations/${organizationId}/branding`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.branding ?? null) : null;
  },
);

export const loadOrganizationMembers = cache(
  async (organizationId: string): Promise<OrganizationMember[] | null> => {
    const result = await backendJson<{ ok: true; members: OrganizationMember[] }>({
      path: `/api/teacher/organizations/${organizationId}/members`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.members ?? []) : null;
  },
);

export const loadOrganizationInvites = cache(
  async (organizationId: string): Promise<OrganizationInvite[] | null> => {
    const result = await backendJson<{ ok: true; invites: OrganizationInvite[] }>({
      path: `/api/teacher/organizations/${organizationId}/invites`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.invites ?? []) : null;
  },
);

export const loadOrganizationFlags = cache(
  async (organizationId: string): Promise<ResolvedFlags | null> => {
    const result = await backendJson<{ ok: true; flags: ResolvedFlags }>({
      path: `/api/teacher/organizations/${organizationId}/flags`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.flags ?? null) : null;
  },
);

export const loadOrganizationOverview = cache(
  async (organizationId: string, days = 30): Promise<OrganizationOverview | null> => {
    const result = await backendJson<{ ok: true; overview: OrganizationOverview }>({
      path: `/api/teacher/organizations/${organizationId}/reports/overview`,
      search: `?days=${days}`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.overview ?? null) : null;
  },
);

export const loadOrganizationActivityTrend = cache(
  async (organizationId: string, days = 30): Promise<ActivityTrend | null> => {
    const result = await backendJson<{ ok: true; trend: ActivityTrend }>({
      path: `/api/teacher/organizations/${organizationId}/reports/activity`,
      search: `?days=${days}`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.trend ?? null) : null;
  },
);

export const loadOrganizationProficiency = cache(
  async (organizationId: string): Promise<OrganizationProficiency | null> => {
    const result = await backendJson<{ ok: true; proficiency: OrganizationProficiency }>({
      path: `/api/teacher/organizations/${organizationId}/reports/proficiency`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.proficiency ?? null) : null;
  },
);

export const loadGroupBreakdown = cache(
  async (organizationId: string, days = 30): Promise<GroupBreakdown | null> => {
    const result = await backendJson<{ ok: true; breakdown: GroupBreakdown }>({
      path: `/api/teacher/organizations/${organizationId}/reports/groups`,
      search: `?days=${days}`,
      cache: "no-store",
    });
    return result.status === 200 ? (result.data?.breakdown ?? null) : null;
  },
);

export const loadOrganizationAudit = cache(
  async (organizationId: string, limit = 50): Promise<AuditPage | null> => {
    const result = await backendJson<{ ok: true; entries: AuditPage["entries"]; total: number }>({
      path: `/api/teacher/organizations/${organizationId}/audit`,
      search: `?limit=${limit}`,
      cache: "no-store",
    });
    if (result.status !== 200 || !result.data) return null;
    return { entries: result.data.entries, total: result.data.total };
  },
);

/**
 * Resolve a hostname to a tenant. Unauthenticated on the backend, because a
 * branded LOGIN page has to know whose brand to wear before anyone has logged
 * in — see lib/platform/tenant.js for why its payload is deliberately public.
 *
 * The host is passed explicitly: this Web tier is the reverse proxy, so its
 * OWN Host header is not the visitor's.
 */
export const resolveTenant = cache(async (host: string): Promise<ResolvedTenant | null> => {
  const result = await backendJson<{ ok: true; tenant: ResolvedTenant | null }>({
    path: "/api/platform/tenant/resolve",
    search: `?host=${encodeURIComponent(host)}`,
    // Short revalidate rather than no-store: branding changes rarely, this
    // runs on EVERY request to a branded host, and 60s of staleness on a logo
    // is worth not adding a backend round trip to every page load. Keyed by
    // the host, which is what makes it safe — see 02_MULTI_TENANCY.md on
    // cache scope.
    revalidate: 60,
  });
  if (result.status !== 200 || !result.data) return null;
  return result.data.tenant;
});
