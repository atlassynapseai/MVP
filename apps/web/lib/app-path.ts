// Trimmed app URL — NEXT_PUBLIC_APP_URL can have a trailing newline in Vercel.
export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

// Path prefix: "/MVP" in production, "" in local dev.
export const basePath = appUrl ? new URL(appUrl).pathname.replace(/\/$/, "") : "";
