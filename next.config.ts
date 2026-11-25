import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
