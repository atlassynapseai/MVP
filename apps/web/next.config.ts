import type { NextConfig } from "next";

// Derive basePath from NEXT_PUBLIC_APP_URL so the app works correctly when
// hosted at a sub-path (e.g. https://atlassynapseai.com/MVP).
// In local dev NEXT_PUBLIC_APP_URL=http://localhost:3000 → pathname="/" → no basePath.
const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
const derivedBasePath = rawAppUrl
  ? new URL(rawAppUrl).pathname.replace(/\/$/, "")
  : "";

const nextConfig: NextConfig = {
  transpilePackages: ["@atlas/shared", "@atlas/db"],
  ...(derivedBasePath ? { basePath: derivedBasePath } : {}),
};

export default nextConfig;
