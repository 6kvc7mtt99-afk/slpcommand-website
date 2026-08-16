import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/login",
          "/signup",
          "/dashboard",
          "/reading",
          "/listening",
          "/writing",
          "/speaking",
          "/progress",
          "/profile",
          "/onboarding",
          "/subscription",
          "/api",
        ],
      },
    ],
    sitemap: "https://slpcommand.com/sitemap.xml",
  };
}
