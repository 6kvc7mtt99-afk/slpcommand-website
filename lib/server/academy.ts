// FASE PLATFORM-PROVISIONING-001 — what the creation page needs to know
// before it renders anything.
//
// One loader, one question: may this person create an academy, and how many
// have they already got. Asked on the SERVER so the answer arrives with the
// page rather than after a spinner, and so a browser that lies about it
// changes nothing — POST /api/academies re-counts before it inserts.

import { cache } from "react";
import { backendJson } from "./backend";

export type AcademyQuota = {
  owned: number;
  limit: number;
  canCreate: boolean;
};

export const loadAcademyQuota = cache(async (): Promise<AcademyQuota | null> => {
  const result = await backendJson<{ ok: true } & AcademyQuota>({
    path: "/api/academies/quota",
    cache: "no-store",
  });
  if (result.status !== 200 || !result.data) return null;
  return {
    owned: result.data.owned,
    limit: result.data.limit,
    canCreate: result.data.canCreate,
  };
});
