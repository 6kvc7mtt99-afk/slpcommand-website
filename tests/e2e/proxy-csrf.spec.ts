import { expect, test } from "@playwright/test";

test("cookie-only GET to the proxy does not reach the allowlist without X-SLP-Client", async ({ request }) => {
  const res = await request.get("/api/backend/progress");
  expect(res.status()).toBe(400);
  expect(await res.json()).toMatchObject({ error: "missing_client_header" });
});

test("legacy reading/next is gone", async ({ request }) => {
  const res = await request.get("/api/backend/reading/next", {
    headers: { "X-SLP-Client": "web" },
  });
  expect(res.status()).toBe(410);
});

test("shared-secret admin generate routes stay gone", async ({ request }, testInfo) => {
  // Send the same origin the server considers same-origin. Hardcoding
  // 127.0.0.1 produced a 403 from the CSRF middleware instead of the 410 this
  // test is actually asserting — see the note in playwright.config.ts.
  const origin = testInfo.project.use.baseURL!;
  const res = await request.post("/api/backend/admin/billing/reconcile", {
    headers: { "X-SLP-Client": "web", Origin: origin },
  });
  expect(res.status()).toBe(410);
  expect(await res.json()).toMatchObject({ reason: "admin_secret" });
});
