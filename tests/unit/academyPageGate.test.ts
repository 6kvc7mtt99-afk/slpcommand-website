// FASE PLATFORM-PROVISIONING-001 — who can reach /academy/new.
//
// This is the test that would have caught the routing mistake the whole
// feature turns on. The natural place to put a "create academy" page is under
// /teacher/*, and it is the one place it cannot go: TeacherLayout redirects
// anybody with zero staff memberships to /dashboard, and somebody creating
// their FIRST academy has zero staff memberships by definition. The page would
// have been reachable only by people who no longer needed it.
//
// So these tests assert the opposite gate: a session and nothing else.

import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.hoisted because vi.mock factories are lifted above every other statement
// in the file, so a plain `const` declared here would not exist yet when the
// factory runs. The alternative — declaring the spies inside each factory —
// would leave no handle to assert on.
const { redirect, readAuthCookies, loadAcademyQuota, loadTeacherMemberships } = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }),
  readAuthCookies: vi.fn(),
  loadAcademyQuota: vi.fn(),
  loadTeacherMemberships: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect, notFound: vi.fn() }));
vi.mock("@/lib/server/authCookies", () => ({ readAuthCookies: () => readAuthCookies() }));
vi.mock("@/lib/server/academy", () => ({ loadAcademyQuota: () => loadAcademyQuota() }));
vi.mock("@/lib/server/teacher", () => ({ loadTeacherMemberships: () => loadTeacherMemberships() }));

import AcademyLayout from "../../app/academy/layout";
import NewAcademyPage from "../../app/academy/new/page";

/**
 * The visible text of a rendered element tree, and the component names in it.
 *
 * JSON.stringify would be shorter and is a trap: React splits interpolated
 * text into separate array entries, so `owns {n} {word}` serialises with
 * quotes and commas between the pieces and an assertion about the SENTENCE
 * ends up asserting about React's internal representation instead. Walking the
 * tree gives the string a reader would actually see.
 */
function textOf(node: unknown): string {
  if (node === null || node === undefined || node === false || node === true) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const el = node as { type?: unknown; props?: { children?: unknown } };
  const name = typeof el.type === "function" ? `<${(el.type as { name?: string }).name ?? "anon"}>` : "";
  return name + textOf(el.props?.children);
}

beforeEach(() => {
  redirect.mockClear();
  readAuthCookies.mockReset();
  loadAcademyQuota.mockReset();
  loadTeacherMemberships.mockReset().mockResolvedValue([]);
});

describe("the gate on /academy/*", () => {
  it("sends a visitor with no session to the login page", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: null, refreshToken: null });
    await expect(AcademyLayout({ children: null })).rejects.toThrow("REDIRECT:/login");
  });

  it("LETS IN somebody with a session and no memberships at all", async () => {
    // The whole point. Under TeacherLayout this person would be redirected to
    // /dashboard and could never create anything.
    readAuthCookies.mockResolvedValue({ accessToken: "t", refreshToken: "r" });
    await expect(AcademyLayout({ children: null })).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("accepts a refresh token alone — an expired access token is not a logout", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: null, refreshToken: "r" });
    await expect(AcademyLayout({ children: null })).resolves.toBeTruthy();
  });

  it("is marked noindex — a provisioning screen has no business in search results", async () => {
    const { metadata } = await import("../../app/academy/layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("the page decides what to render from the QUOTA, before painting", () => {
  it("renders the form when the account may create one", async () => {
    loadAcademyQuota.mockResolvedValue({ owned: 0, limit: 3, canCreate: true });
    const tree = textOf(await NewAcademyPage());
    expect(tree).toContain("<CreateAcademyForm>");
    expect(tree).not.toMatch(/reached the limit/i);
  });

  it("explains the limit INSTEAD of the form when the account is at it", async () => {
    // Not "renders the form and fails on submit". Somebody at their limit
    // should learn it before typing, not after.
    loadAcademyQuota.mockResolvedValue({ owned: 3, limit: 3, canCreate: false });
    const tree = textOf(await NewAcademyPage());
    expect(tree).toMatch(/reached the limit/i);
    expect(tree).toMatch(/maximum of 3/i);
    expect(tree).not.toContain("<CreateAcademyForm>");
  });

  it("says so plainly when the account cannot be loaded, rather than showing a form that will fail", async () => {
    loadAcademyQuota.mockResolvedValue(null);
    const tree = textOf(await NewAcademyPage());
    expect(tree).toMatch(/could not load your account/i);
    expect(tree).not.toContain("<CreateAcademyForm>");
  });

  it("lists the academies already owned, and only those OWNED", async () => {
    loadAcademyQuota.mockResolvedValue({ owned: 1, limit: 3, canCreate: true });
    loadTeacherMemberships.mockResolvedValue([
      { organizationId: "o1", role: "owner", organizationName: "Mine" },
      { organizationId: "o2", role: "teacher", organizationName: "Somewhere I Teach" },
      { organizationId: "o3", role: "admin", organizationName: "Somewhere I Admin" },
    ]);
    const tree = textOf(await NewAcademyPage());
    expect(tree).toMatch(/Mine/);
    expect(tree).not.toMatch(/Somewhere I Teach/);
    expect(tree).not.toMatch(/Somewhere I Admin/);
  });

  it("uses the singular for one academy and the plural for more", async () => {
    loadAcademyQuota.mockResolvedValue({ owned: 1, limit: 1, canCreate: false });
    expect(textOf(await NewAcademyPage())).toMatch(/owns 1 academy,/);
    loadAcademyQuota.mockResolvedValue({ owned: 3, limit: 3, canCreate: false });
    expect(textOf(await NewAcademyPage())).toMatch(/owns 3 academies,/);
  });
});
