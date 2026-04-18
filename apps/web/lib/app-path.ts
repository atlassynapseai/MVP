// Path prefix derived from NEXT_PUBLIC_APP_URL.
// "/MVP" in production (https://atlassynapseai.com/MVP), "" in local dev.
export const basePath =
  process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).pathname.replace(/\/$/, "")
    : "";
