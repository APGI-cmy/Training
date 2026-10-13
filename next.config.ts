import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return ["/reset-password", "/confirm-account"].map(source => ({ source, headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }
    ] }));
  },
  async redirects() {
    return [
      {
        source: "/courses/vpshr-level-0/unit:unit(\\d+)",
        destination: "/courses/vpshr-level-0/lu:unit",
        permanent: false
      }
    ];
  }
};

export default nextConfig;
