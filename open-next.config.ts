import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Incremental cache (R2) is optional. PR-00 must not require a production bucket.
export default defineCloudflareConfig({});
