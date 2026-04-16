import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atlas/shared", "@atlas/db"],
};

export default nextConfig;
