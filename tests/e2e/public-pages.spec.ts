import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/privacy",
  "/terms",
  "/ai-usage",
  "/security",
  "/cookies",
  "/data-retention",
  "/delete-account",
  "/disclaimer",
  "/intellectual-property",
  "/legal-notice",
  "/subprocessors",
  "/support",
  "/contact",
  "/trust-center",
  "/stanag-6001",
  "/slp",
  "/slp-2",
  "/slp-3",
  "/es/examen-slp",
  "/es/slp-2",
  "/es/slp-3",
  "/guides",
  "/guides/writing",
  "/guides/listening",
  "/exam",
  "/about",
];

test("public pages return 200 and keep legal titles", async ({ page }) => {
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.ok(), path).toBeTruthy();
  }
  await page.goto("/privacy");
  await expect(page.locator("h1")).toContainText("Privacy Policy");
  await page.goto("/cookies");
  await expect(page.locator("body")).toContainText("slp_at");
});

test(".html URLs redirect to extensionless", async ({ request }) => {
  const res = await request.get("/privacy.html", { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
});

test("robots disallows admin and app", async ({ request }) => {
  const res = await request.get("/robots.txt");
  const body = await res.text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /dashboard");
  expect(body).toContain("Disallow: /spike");
});

const AUTHORITY_PATHS = [
  "/stanag-6001",
  "/slp",
  "/slp-2",
  "/slp-3",
  "/es/examen-slp",
  "/es/slp-2",
  "/es/slp-3",
  "/guides",
  "/guides/writing",
  "/guides/listening",
  "/exam",
  "/about",
];

test("every authority page ships a canonical and a 1200x630 social card", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of AUTHORITY_PATHS) {
    await page.goto(path);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, `${path} canonical`).toBe(`https://slpcommand.com${path}`);

    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image, `${path} og:image`).toBeTruthy();
    const width = await page.locator('meta[property="og:image:width"]').getAttribute("content");
    expect(width, `${path} og:image:width`).toBe("1200");

    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    expect(twitterImage, `${path} twitter:image`).toBeTruthy();

    seen.add(new URL(image!).pathname);
  }

  // The cards must actually resolve, not just be referenced.
  for (const asset of seen) {
    const res = await request.get(asset);
    expect(res.status(), asset).toBe(200);
  }
});

test("breadcrumb schema matches the rendered trail", async ({ page }) => {
  await page.goto("/guides/writing");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const crumbs = blocks
    .map((raw) => JSON.parse(raw))
    .find((data) => data["@type"] === "BreadcrumbList");
  expect(crumbs, "BreadcrumbList missing").toBeTruthy();
  expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
    "SLP Command",
    "Guides",
    "Writing",
  ]);

  const visible = await page.locator(".authority-crumbs").innerText();
  expect(visible).toContain("Guides");
  expect(visible).toContain("Writing");
});

test("brand assets and machine-readable entity file resolve", async ({ request }) => {
  for (const asset of ["/favicon.ico", "/icon.png", "/apple-icon.png", "/llms.txt"]) {
    const res = await request.get(asset);
    expect(res.status(), asset).toBe(200);
  }
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("Do not say");
});

test("sitemap advertises the authority cluster with stable dates", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  for (const path of AUTHORITY_PATHS) {
    expect(body, `sitemap missing ${path}`).toContain(`<loc>https://slpcommand.com${path}</loc>`);
  }
  // No app routes may leak into the sitemap.
  for (const blocked of ["/dashboard", "/reading/practice", "/admin", "/onboarding"]) {
    expect(body, `sitemap leaks ${blocked}`).not.toContain(
      `<loc>https://slpcommand.com${blocked}</loc>`,
    );
  }
  // lastmod must not be today's build timestamp.
  const stamps = [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  expect(stamps.length).toBeGreaterThan(20);
  for (const stamp of stamps) {
    expect(Date.now() - new Date(stamp).getTime(), `${stamp} looks like build time`).toBeGreaterThan(
      60_000,
    );
  }
});
