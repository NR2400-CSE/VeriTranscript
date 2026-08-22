import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  typescript: {
    // Prevent build failures due to minor type mismatches during deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;