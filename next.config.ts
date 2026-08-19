import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@elevenlabs/react", "@elevenlabs/client", "@elevenlabs/types"],
  outputFileTracingRoot: path.join(__dirname),
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
