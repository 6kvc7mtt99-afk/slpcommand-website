import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@elevenlabs/react", "@elevenlabs/client", "@elevenlabs/types"],
  outputFileTracingRoot: path.join(__dirname),
  // ── FASE WEB-HEADERS-001 ──────────────────────────────────────────────────
  //
  // THE FINDING. Production sent NO security headers at all. Measured against
  // the live site on 2026-08-23: no Strict-Transport-Security, no
  // X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, no
  // Permissions-Policy. For a marketing site that would be untidy; for a site
  // that holds an authenticated session in an httpOnly cookie and offers a
  // checkout, it is a real gap — an authenticated page that can be framed is a
  // clickjacking target, and a permissive referrer policy leaks authenticated
  // URLs to third parties.
  //
  // WHAT IS DELIBERATELY NOT HERE: an enforcing Content-Security-Policy. Next.js
  // emits inline bootstrap scripts, so a real CSP needs a nonce threaded through
  // the middleware, and the Coach opens WebSockets to ElevenLabs/LiveKit hosts
  // that would have to be enumerated exactly in `connect-src`. Getting either
  // wrong is a production outage on the paywall or the Coach, not a warning.
  // That work is scoped in docs/remediation/MANUAL_WEB_ACTIONS.md rather than
  // guessed at here. Everything below is verified non-breaking against the
  // actual application:
  //
  //   microphone=(self)  Speaking recording and the live Coach BOTH call
  //                      navigator.mediaDevices.getUserMedia. Omitting this, or
  //                      writing microphone=(), would silently break the one
  //                      feature the product is differentiated by.
  //   frame-ancestors    verified: the app embeds no iframes and is embedded in
  //                      none, so DENY costs nothing.
  async headers() {
    const securityHeaders = [
      // Two years, subdomains included, preload-eligible. The site is
      // HTTPS-only behind Cloudflare already; this stops the first-request
      // downgrade window.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // Stops a response being reinterpreted as a script because a browser
      // guessed at its type.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Clickjacking. X-Frame-Options for older agents, frame-ancestors for
      // current ones — the latter is the only CSP directive used here, and it
      // is the one directive that cannot break a page that is never framed.
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      // Send the origin cross-site, the full URL same-site. Keeps authenticated
      // paths out of third-party referer logs.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Everything off except the microphone, which Speaking and the Coach need.
      {
        key: "Permissions-Policy",
        value: [
          "accelerometer=()", "autoplay=(self)", "camera=()", "display-capture=()",
          "encrypted-media=()", "fullscreen=(self)", "geolocation=()", "gyroscope=()",
          "magnetometer=()", "microphone=(self)", "midi=()", "payment=()",
          "usb=()", "xr-spatial-tracking=()",
        ].join(", "),
      },
      // Isolates the browsing context from openers, so a page opened by this
      // one cannot reach back into it.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/:path*.html", destination: "/:path*", permanent: true },
      { source: "/www", destination: "/", permanent: true },
      // `/es` is the natural shortening of the Spanish cluster and a likely
      // hand-typed or shared address, but nothing was mounted there, so it 404'd.
      // Send it to the Spanish entry page rather than the English homepage.
      { source: "/es", destination: "/es/examen-slp", permanent: true },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
