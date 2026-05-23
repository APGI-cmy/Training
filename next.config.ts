import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
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
