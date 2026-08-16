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
