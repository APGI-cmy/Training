import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import release from "./src/data/platform-release.json";

// The coordinated uploader adds this file outside the source archives.
const sourceStampPath = join(process.cwd(), ".alp-release-source.json");
let buildCommit: string | undefined;
if (existsSync(sourceStampPath)) {
  const stamp = JSON.parse(readFileSync(sourceStampPath, "utf8")) as { version?: string; commit?: string } | null;
  if (stamp?.version !== release.version || typeof stamp.commit !== "string" || !/^[0-9a-f]{40}$/.test(stamp.commit)) {
    throw new Error("The deployment source stamp does not match the platform release.");
  }
  buildCommit = stamp.commit;
}

const nextConfig: NextConfig = {
  env: buildCommit ? { ALP_BUILD_SOURCE_COMMIT: buildCommit } : undefined,
  // The image optimiser must not become a public proxy for private course files.
  images: {localPatterns:[{pathname:'/images/**'},{pathname:'/branding/**'}]},
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  outputFileTracingIncludes: {
    "/api/certificates/*": [
      "./public/certificate-fonts/**",
      "./public/branding/apgi-logo.png",
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return ["/:path*"].map((source) => ({
      source,
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    }));
  },
  async redirects() {
    return [
      {
        source: "/courses/vpshr-level-0/unit:unit(\\d+)",
        destination: "/courses/vpshr-level-0/lu:unit",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
