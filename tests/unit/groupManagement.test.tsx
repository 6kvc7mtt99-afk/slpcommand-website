/** @vitest-environment happy-dom */

// FASE PLATFORM-GROUPS-001 — cohort management from the browser's side.
//
// The property worth protecting here is not "does the select render". It is
// that the request carries the ROW'S REAL ROLE. teacher_memberships is
// UNIQUE (user_id, organization_id, role), so one person may hold several
// rows, and `role` is what decides which one moves. The endpoint itself
// defaults to "student" when the field is absent — which means a component
// that forgot to send it would silently move the wrong row, or none, and
// would look like it worked.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const apiRequest = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { apiRequest: (...args: unknown[]) => apiRequest(...args), FrontendError: actual.FrontendError };
});

import { AssignGroupControl } from "../../components/teacher/AssignGroupControl";
import { GroupNameForm } from "../../components/teacher/GroupNameForm";
import { GroupRoster } from "../../components/teacher/GroupRoster";
import type { RosterStudent } from "@/lib/teacher/types";
import { FrontendError } from "@/lib/api/errors";

const ORG = "org-1";
const GROUPS = [
  { id: "g1", name: "Morning", created_at: "2026-01-01", studentCount: 2 },
  { id: "g2", name: "Evening", created_at: "2026-01-02", studentCount: 0 },
];

afterEach(cleanup);
beforeEach(() => {
  refresh.mockReset();
  apiRequest.mockReset().mockResolvedValue({ ok: true });
});

const selector = () => screen.getByRole("combobox") as HTMLSelectElement;

function renderControl(overrides: Partial<React.ComponentProps<typeof AssignGroupControl>> = {}) {
  return render(
    <AssignGroupControl
      organizationId={ORG}
      userId="user-1"
      role="student"
      currentGroupId={null}
      groups={GROUPS}
      label="Ana Alpha"
      {...overrides}
    />,
  );
}

describe("AssignGroupControl — assign, move, remove", () => {
  it("assigns an unassigned student to a group", async () => {
    renderControl();
    fireEvent.change(selector(), { target: { value: "g1" } });
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        `/api/teacher/organizations/${ORG}/members/user-1/group`,
        { method: "PATCH", body: { groupId: "g1", role: "student" } },
      ),
    );
  });

  it("MOVES a student from one group to another", async () => {
    renderControl({ currentGroupId: "g1" });
    fireEvent.change(selector(), { target: { value: "g2" } });
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.groupId).toBe("g2"));
  });

  it("REMOVES the assignment by sending a real null, not an empty string", async () => {
    // "" is the option's value; the endpoint reads null as "unfile them". An
    // empty string would be a group id that does not exist and would 404.
    renderControl({ currentGroupId: "g1" });
    fireEvent.change(selector(), { target: { value: "" } });
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.groupId).toBeNull());
  });

  it("sends the ROW'S role, never an assumed 'student'", async () => {
    // The test this component exists to satisfy. A teacher who also holds a
    // student membership has two rows; sending the wrong role moves the wrong
    // one — silently, because the endpoint accepts it.
    renderControl({ role: "teacher" });
    fireEvent.change(selector(), { target: { value: "g1" } });
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.role).toBe("teacher"));
  });

  it("does nothing at all when the selection did not change", async () => {
    renderControl({ currentGroupId: "g1" });
    fireEvent.change(selector(), { target: { value: "g1" } });
    await new Promise((r) => setTimeout(r, 50));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("refreshes so the counts around it cannot go stale", async () => {
    // The group cards, the unassigned bucket and the roster filter are all
    // derived from this one row. Not refreshing would leave a screen that
    // disagrees with itself.
    renderControl();
    fireEvent.change(selector(), { target: { value: "g1" } });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows Saved after success", async () => {
    renderControl();
    fireEvent.change(selector(), { target: { value: "g1" } });
    await waitFor(() => expect(screen.getByText("Saved")).toBeTruthy());
  });

  it("renders the current group as the selected option", () => {
    renderControl({ currentGroupId: "g2" });
    expect(selector().value).toBe("g2");
  });

  it("renders Unassigned as the selection when there is no group", () => {
    renderControl({ currentGroupId: null });
    expect(selector().value).toBe("");
  });

  it("offers every group plus Unassigned, and nothing else", () => {
    renderControl();
    const values = Array.from(selector().options).map((o) => o.value);
    expect(values).toEqual(["", "g1", "g2"]);
  });

  it("labels the control with the person, for screen readers", () => {
    renderControl();
    expect(screen.getByLabelText("Group for Ana Alpha")).toBeTruthy();
  });
});

describe("AssignGroupControl — refusals read as instructions", () => {
  async function failWith(err: unknown, expected: RegExp) {
    apiRequest.mockRejectedValue(err);
    renderControl();
    fireEvent.change(selector(), { target: { value: "g1" } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(expected));
    expect(refresh).not.toHaveBeenCalled();
  }

  it("403 says it is a permission problem", async () => {
    await failWith(new FrontendError({ code: "backend", message: "no", status: 403 }), /do not have permission/i);
  });

  it("group_not_found tells them to reload rather than retry", async () => {
    await failWith(
      new FrontendError({ code: "backend", message: "no", status: 404, reason: "group_not_found" }),
      /group no longer exists/i,
    );
  });

  it("not_found names the member, not the group", async () => {
    await failWith(
      new FrontendError({ code: "backend", message: "no", status: 404, reason: "not_found" }),
      /no longer active here/i,
    );
  });

  it("an unknown failure is honest rather than specific", async () => {
    await failWith(new Error("network"), /could not change the group/i);
  });
});

describe("GroupNameForm — rename", () => {
  const renderForm = (name = "Morning") =>
    render(<GroupNameForm organizationId={ORG} groupId="g1" name={name} />);

  it("renames through the existing PATCH endpoint", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Early Birds" } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        `/api/teacher/organizations/${ORG}/groups/g1`,
        { method: "PATCH", body: { name: "Early Birds" } },
      ),
    );
  });

  it("trims before sending", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "  Spaced  " } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.name).toBe("Spaced"));
  });

  it("cannot be submitted with the name unchanged", () => {
    renderForm("Morning");
    expect(screen.getByRole("button", { name: /rename group/i })).toHaveProperty("disabled", true);
  });

  it("cannot be submitted empty", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /rename group/i })).toHaveProperty("disabled", true);
  });

  it("gives 409 duplicate its OWN message, so the person knows what to change", async () => {
    apiRequest.mockRejectedValue(
      new FrontendError({ code: "backend", message: "dup", status: 409, reason: "duplicate_name" }),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Evening" } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/group with this name already exists/i),
    );
  });

  it("403 reads as a permission problem, not a duplicate", async () => {
    apiRequest.mockRejectedValue(new FrontendError({ code: "backend", message: "no", status: 403 }));
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Anything" } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/do not have permission/i));
  });

  it("refreshes on success so every place the name appears updates", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByText("Renamed.")).toBeTruthy();
  });

  it("does not refresh when the rename failed", async () => {
    apiRequest.mockRejectedValue(
      new FrontendError({ code: "backend", message: "dup", status: 409, reason: "duplicate_name" }),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Evening" } });
    fireEvent.click(screen.getByRole("button", { name: /rename group/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("GroupRoster — names, never ids", () => {
  // The UUID problem, tested directly. groupDetailGate covers the page, but
  // its fixture student HAS a name, so a fallback to the id would never fire
  // there — a mutation replacing the honest null with `s.studentId` survived
  // that suite. These are the cases that catch it.
  const student = (over: Partial<RosterStudent> = {}): RosterStudent => ({
    studentId: "0022cccf-5b8c-4cdb-891a-ff6068fe3e13",
    name: "Ana Alpha",
    email: "ana@example.com",
    memberSince: "2026-01-01T00:00:00Z",
    groupId: "g1",
    groupName: "Morning",
    targetLevel: "3",
    lastActivityAt: null,
    lastActivityDate: "2026-08-01",
    ...over,
  });

  it("renders the person's name", () => {
    render(<GroupRoster organizationId={ORG} students={[student()]} groups={GROUPS} canWriteGroups={false} />);
    expect(screen.getByText("Ana Alpha")).toBeTruthy();
  });

  it("says 'No name recorded' when there is none — and NEVER prints the id", () => {
    const s = student({ name: null });
    render(<GroupRoster organizationId={ORG} students={[s]} groups={GROUPS} canWriteGroups={false} />);
    expect(screen.getByText("No name recorded")).toBeTruthy();
    expect(document.body.textContent).not.toContain(s.studentId);
  });

  it("never prints the id even when the email is missing too", () => {
    const s = student({ name: null, email: null });
    render(<GroupRoster organizationId={ORG} students={[s]} groups={GROUPS} canWriteGroups={false} />);
    expect(document.body.textContent).not.toContain(s.studentId);
  });

  it("shows the group as plain text when the viewer cannot write groups", () => {
    render(<GroupRoster organizationId={ORG} students={[student()]} groups={GROUPS} canWriteGroups={false} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Morning")).toBeTruthy();
  });

  it("shows the selector when the viewer CAN write groups", () => {
    render(<GroupRoster organizationId={ORG} students={[student()]} groups={GROUPS} canWriteGroups />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("shows plain text when there are no groups to move anyone into", () => {
    render(<GroupRoster organizationId={ORG} students={[student({ groupName: null, groupId: null })]} groups={[]} canWriteGroups />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Unassigned")).toBeTruthy();
  });

  it("renders its empty state rather than a headerless table", () => {
    render(<GroupRoster organizationId={ORG} students={[]} groups={GROUPS} canWriteGroups emptyLabel="Nobody here." />);
    expect(screen.getByText("Nobody here.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sends role='student' for a roster that is students only", async () => {
    render(<GroupRoster organizationId={ORG} students={[student()]} groups={GROUPS} canWriteGroups />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "g2" } });
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.role).toBe("student"));
  });
});
