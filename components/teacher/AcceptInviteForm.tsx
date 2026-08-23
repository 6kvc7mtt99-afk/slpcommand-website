"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { AcceptInviteResponse } from "@/lib/teacher/types";

type Status = "idle" | "busy" | "accepted" | "invalid" | "error";

/**
 * FASE TEACHER-GROUPS-001 — redemption requires an explicit click, never an
 * automatic POST on page load. A prefetch, an email link-scanner, or a
 * simple GET must not be able to consume a real, single-use token by
 * themselves — only a person clicking "Accept" does.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  async function accept() {
    setStatus("busy");
    try {
      await apiRequest<AcceptInviteResponse>("/api/teacher/invites/accept", {
        method: "POST",
        body: { token },
      });
      setStatus("accepted");
      // Teacher's own layout resolves whether this membership grants staff
      // access (redirects to /teacher/<org>) or not (redirects to /dashboard)
      // — this page does not need to know result.role to route correctly.
      setTimeout(() => router.push("/teacher"), 1200);
    } catch (err) {
      if (err instanceof FrontendError && err.status === 400) {
        setStatus("invalid");
      } else {
        setStatus("error");
      }
    }
  }

  if (status === "accepted") {
    return <p className="teacher-inline-success" role="status">You&apos;ve joined the organization. Redirecting…</p>;
  }
  if (status === "invalid") {
    return (
      <p className="teacher-inline-error" role="alert">
        This invitation link is invalid or has expired. Ask whoever invited you for a new one.
      </p>
    );
  }
  if (status === "error") {
    return (
      <>
        <p className="teacher-inline-error" role="alert">Something went wrong. Try again.</p>
        <button className="btn btn-primary" type="button" onClick={() => void accept()} style={{ marginTop: 8 }}>
          Try again
        </button>
      </>
    );
  }

  return (
    <button className="btn btn-primary" type="button" disabled={status === "busy"} onClick={() => void accept()}>
      {status === "busy" ? "Joining…" : "Accept invitation"}
    </button>
  );
}
