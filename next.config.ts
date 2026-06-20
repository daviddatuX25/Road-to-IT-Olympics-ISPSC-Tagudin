import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow Server Actions to be invoked from the preview gateway, which forwards
  // requests with a different x-forwarded-host than the origin header.
  allowedDevOrigins: ["*"],
  experimental: {
    // Trust the gateway's forwarded host header so Server Actions CSRF check passes.
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
