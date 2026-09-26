import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["localhost", "127.0.0.1", ...(process.env.APP_ORIGIN ? [new URL(process.env.APP_ORIGIN).hostname] : [])],
};

export default nextConfig;
